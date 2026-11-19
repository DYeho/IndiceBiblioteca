import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import { createApp } from '../src/app.js';
import { initializeDatabase, openDatabase } from '../src/database/conection.js';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';

export async function createTestApp(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'books-test-'));
  const databasePath = join(directory, 'library.sqlite');
  const env = {
    nodeEnv: 'test',
    trustProxy: false,
    databasePath,
    sessionsDir: directory,
    sessionsDb: 'sessions.sqlite',
    sessionSecret: randomBytes(32).toString('hex'),
    allowedOrigin: 'http://localhost',
  };
  const credentials = { username: 'library-admin', password: randomBytes(16).toString('hex') };
  let db = initializeDatabase(databasePath);
  const service = createAuthService({ repository: createAuthRepository(db), bcryptCost: 4 });
  await service.createAdmin(credentials);
  let server;
  let store;
  let url;

  async function start() {
    const SQLiteStore = connectSqlite3(session);
    store = new SQLiteStore({ dir: directory, db: env.sessionsDb });
    await once(store.client, 'connect');
    const app = createApp({
      env,
      db,
      bcryptCost: 4,
      sessionOptions: { store, ...options.sessionOptions },
      apiLimiter: options.apiLimiter,
      logErrors: false,
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    url = `http://127.0.0.1:${server.address().port}`;
  }

  async function stop() {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await new Promise((resolve, reject) => store.db.close(error => error ? reject(error) : resolve()));
    db.close();
  }

  await start();
  return {
    get db() { return db; },
    credentials,
    env,
    async request(path, { method = 'POST', body, rawBody, cookie, headers = {} } = {}) {
      return fetch(url + path, {
        method,
        headers: Object.fromEntries(Object.entries({
          Origin: env.allowedOrigin,
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        }).filter(([, value]) => value !== undefined)),
        body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
        redirect: 'manual',
      });
    },
    async login() {
      const response = await this.request('/api/auth/login', { body: credentials });
      if (response.status !== 200) throw new Error(`Login failed: ${response.status}`);
      return { response, cookie: response.headers.get('set-cookie').split(';')[0] };
    },
    async restart() {
      await stop();
      db = openDatabase(databasePath);
      await start();
    },
    async close() {
      try {
        await stop();
      } finally {
        await rm(directory, { recursive: true });
      }
    },
  };
}

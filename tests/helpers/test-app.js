import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../src/app.js';
import { assertSchemaReady, openDatabase } from '../../src/database/connection.js';

const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'database',
  'schema.sql',
);

export async function startTestApp() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'indice-biblioteca-test-'));
  const dbPath = path.join(tempDir, 'library.sqlite');

  const db = openDatabase(dbPath, { mustExist: false });
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  assertSchemaReady(db);

  const config = {
    nodeEnv: 'test',
    isProduction: false,
    port: 0,
    databasePath: dbPath,
    sessionsDir: tempDir,
    sessionsDb: 'sessions.sqlite',
    sessionSecret: 'test-session-secret-with-at-least-32-chars',
    trustProxy: false,
    allowedOrigin: '',
    bcryptCost: 4,
    sessionMaxAgeMs: 8 * 60 * 60 * 1000,
  };

  const app = createApp({ config, db });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  config.allowedOrigin = baseUrl;

  async function request(route, { method = 'GET', body, cookie, origin = baseUrl, contentType } = {}) {
    const headers = { Accept: 'application/json' };
    if (cookie) {
      headers.Cookie = cookie;
    }
    const isModifying = !['GET', 'HEAD'].includes(method);
    if (isModifying && origin !== null) {
      headers.Origin = origin;
    }
    if (body !== undefined) {
      headers['Content-Type'] = contentType ?? 'application/json';
    } else if (isModifying && contentType !== null) {
      headers['Content-Type'] = contentType ?? 'application/json';
    }

    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers,
      redirect: 'manual',
      body:
        body === undefined
          ? isModifying && (headers['Content-Type'] === 'application/json')
            ? '{}'
            : undefined
          : typeof body === 'string'
            ? body
            : JSON.stringify(body),
    });

    const rawText = await response.text();
    let json = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      // Puede ser HTML o texto plano (ej. redirección 302)
    }

    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    return { status: response.status, headers: response.headers, setCookies, json, text: rawText };
  }

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    const store = app.locals.sessionStore;
    if (store?.reapInterval) {
      clearInterval(store.reapInterval);
    }
    if (store?.db) {
      await new Promise((resolve) => store.db.close(() => resolve()));
    }
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  }

  return { db, config, baseUrl, request, close };
}
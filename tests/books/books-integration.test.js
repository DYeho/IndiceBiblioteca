import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { join } from 'node:path';
import { createTestApp } from '../test-app.js';
import { createBooksRepository } from '../../src/modules/books/books.repository.js';
import { createBooksService } from '../../src/modules/books/books.service.js';
import { normalizeText } from '../../src/utils/normalize-text.js';
import { createApiLimiter } from '../../src/middleware/rate-limit.middleware.js';
import { openDatabase } from '../../src/database/conection.js';

const validBook = { title: 'Cien años de soledad', author: 'Gabriel García Márquez', description: 'Novela', quantity: 5, categoryId: 1 };

async function setup(t, options) {
  const app = await createTestApp(options);
  t.after(() => app.close());
  const { cookie } = await app.login();
  const register = (body = validBook, extra = {}) => app.request('/api/books', { body, cookie, ...extra });
  return { app, cookie, register };
}

test('PB-01 registers through the application and returns the stored public fields', async t => {
  const { register } = await setup(t);
  const response = await register({ ...validBook, title: '  Cien  años de soledad ', author: ' Gabriel García Márquez ', description: ' Novela ' });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data).sort(), ['id', 'title', 'author', 'description', 'quantity', 'categoryId', 'category', 'shelfLabel', 'createdAt', 'updatedAt'].sort());
  assert.equal(data.title, 'Cien  años de soledad');
  assert.equal(data.author, validBook.author);
  assert.equal(data.description, 'Novela');
  assert.equal(data.quantity, 5);
  assert.equal(data.category, 'Literatura');
  assert.equal(data.shelfLabel, null);
  assert.equal(data.createdAt, data.updatedAt);
  assert.ok(Number.isFinite(Date.parse(data.createdAt)));
});

test('PB-02 accepts absent, null, empty and whitespace descriptions', async t => {
  const { register } = await setup(t);
  for (const [index, description] of [undefined, null, '', '  '].entries()) {
    const response = await register({ ...validBook, title: `Libro ${index}`, description });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).data.description, null);
  }
});

test('PB-03 returns 400 and all missing or invalid required text fields', async t => {
  const { app, register } = await setup(t);
  let response = await register({});
  assert.equal(response.status, 400);
  const { error } = await response.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.deepEqual(Object.keys(error.fields).sort(), ['author', 'categoryId', 'quantity', 'title']);
  for (const field of ['title', 'author']) {
    for (const value of [undefined, '', '  ', '\u0301', 123]) {
      response = await register({ ...validBook, [field]: value });
      assert.equal(response.status, 400);
      assert.ok((await response.json()).error.fields[field]);
    }
  }
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 0);
});

test('PB-04 rejects noninteger, nonnumeric and out-of-range quantities with 400', async t => {
  const { register } = await setup(t);
  for (const quantity of [0, -1, 1.5, '5', 'abc', null, 1000, true]) {
    const response = await register({ ...validBook, quantity });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.fields.quantity, 'La cantidad inicial debe ser un número entero entre 1 y 999.');
  }
});

test('PB-05 accepts quantity boundaries 1 and 999', async t => {
  const { register } = await setup(t);
  for (const quantity of [1, 999]) {
    const response = await register({ ...validBook, title: `Libro ${quantity}`, quantity });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).data.quantity, quantity);
  }
});

test('PB-06 enforces all text length boundaries through HTTP', async t => {
  const { register } = await setup(t);
  const response = await register({ title: '📚'.repeat(200), author: 'B'.repeat(150), description: 'C'.repeat(2000), quantity: 1, categoryId: validBook.categoryId });
  assert.equal(response.status, 201);
  for (const [field, length] of [['title', 201], ['author', 151], ['description', 2001]]) {
    const invalid = await register({ ...validBook, [field]: 'A'.repeat(length) });
    assert.equal(invalid.status, 400);
    assert.ok((await invalid.json()).error.fields[field]);
  }
});

test('PB-07 checks the real session before origin, content and body validation', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  for (const cookie of [undefined, 'ib.sid=inventada']) {
    const response = await app.request('/api/books', { cookie, rawBody: '{', headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' } });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: { code: 'UNAUTHENTICATED', message: 'Debe iniciar sesión.' } });
  }
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 0);
});

test('PB-08 preserves the book and the real SQLite session after reopening the application', async t => {
  const { app, register } = await setup(t);
  const response = await register();
  const { data } = await response.json();
  await app.restart();
  const row = app.db.prepare('SELECT * FROM books WHERE id = ?').get(data.id);
  assert.equal(row.title, data.title);
  assert.equal(row.author, data.author);
  assert.equal(row.description, data.description);
  assert.equal(row.quantity, data.quantity);
  assert.equal(row.created_at, data.createdAt);
  assert.equal((await register({ ...validBook, title: 'Otro' })).status, 201);
});

test('PB-09 returns 409 for an existing title and author without inserting', async t => {
  const { app, register } = await setup(t);
  assert.equal((await register()).status, 201);
  const response = await register();
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: { code: 'CONFLICT', message: 'Ese libro ya existe. Edite el libro existente.' } });
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
});

test('PB-10 compares normalized keys without case, accents or repeated spaces', async t => {
  const { register } = await setup(t);
  assert.equal((await register()).status, 201);
  const response = await register({ ...validBook, title: ' CIEN  ANOS DE SOLEDAD ', author: ' GABRIEL  GARCIA MARQUEZ ' });
  assert.equal(response.status, 409);
});

test('PB-11 allows a different title or a different author', async t => {
  const { app, register } = await setup(t);
  for (const body of [validBook, { ...validBook, title: 'Otro' }, { ...validBook, author: 'Otra persona' }]) {
    assert.equal((await register(body)).status, 201);
  }
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 3);
});

test('PB-12 SQLite enforces UNIQUE and the specified CHECK constraints', async t => {
  const { app, register } = await setup(t);
  assert.equal((await register()).status, 201);
  assert.throws(() => app.db.exec('INSERT INTO books (title,author,quantity,category_id,title_normalized,author_normalized) SELECT title,author,quantity,category_id,title_normalized,author_normalized FROM books'), error => error.code === 'SQLITE_CONSTRAINT_UNIQUE');
  for (const quantity of [-1, 1000, 1.5]) {
    assert.throws(() => app.db.prepare('UPDATE books SET quantity = ?').run(quantity), error => error.code === 'SQLITE_CONSTRAINT_CHECK');
  }
  for (const [column, value] of [['title', ''], ['title', 'A'.repeat(201)], ['author', ''], ['author', 'A'.repeat(151)], ['description', 'A'.repeat(2001)], ['shelf_label', ''], ['shelf_label', 'A'.repeat(31)], ['title_normalized', ''], ['author_normalized', '']]) {
    assert.throws(() => app.db.prepare(`UPDATE books SET ${column} = ?`).run(value), error => error.code === 'SQLITE_CONSTRAINT_CHECK');
  }
  app.db.prepare('UPDATE books SET quantity = 0').run();
  assert.equal(app.db.prepare('SELECT quantity FROM books').get().quantity, 0);
});

test('PB-13 converts a real UNIQUE violation to an HTTP-compatible conflict', async t => {
  const { app, register } = await setup(t);
  assert.equal((await register()).status, 201);
  const repository = createBooksRepository(app.db);
  const service = createBooksService({ repository: { ...repository, findByNormalizedKey: () => null }, normalizeText });
  assert.throws(() => service.registerBook(validBook), error => error.status === 409 && error.code === 'CONFLICT');
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
});

test('PB-14 stores normalized columns without disclosing them or accepting internal fields', async t => {
  const { app, register } = await setup(t);
  const response = await register({ ...validBook, id: 400, shelfLabel: 'A', titleNormalized: 'injected', authorNormalized: 'injected' });
  const { data } = await response.json();
  assert.equal(data.shelfLabel, null);
  assert.notEqual(data.id, 400);
  assert.equal(Object.hasOwn(data, 'titleNormalized'), false);
  assert.equal(Object.hasOwn(data, 'authorNormalized'), false);
  const row = app.db.prepare('SELECT * FROM books').get();
  assert.equal(row.title_normalized, 'cien anos de soledad');
  assert.equal(row.author_normalized, 'gabriel garcia marquez');
});

test('PB-15 returns 400 for malformed JSON and bodies exceeding 16 kB', async t => {
  const { register } = await setup(t);
  for (const rawBody of ['{', JSON.stringify({ ...validBook, description: 'A'.repeat(17000) })]) {
    const response = await register(validBook, { rawBody });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
});

test('PB-16 preserves HTML and SQL-like text as parameterized data', async t => {
  const { app, register } = await setup(t);
  const title = "<script>alert(1)</script> '; DROP TABLE books; --";
  const response = await register({ ...validBook, title });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.title, title);
  assert.equal(app.db.prepare('SELECT title FROM books').get().title, title);
});

test('authenticated registration enforces origin and JSON content type before book validation', async t => {
  const { register } = await setup(t);
  for (const headers of [{ Origin: 'http://other.example' }, { Origin: undefined, Referer: undefined }]) {
    const response = await register({}, { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  }
  const response = await register({}, { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  assert.equal((await register(validBook, { headers: { Origin: undefined, Referer: 'http://localhost/admin/' } })).status, 201);
});

test('the existing general limiter protects registration', async t => {
  const { register } = await setup(t, { apiLimiter: createApiLimiter({ limit: 2 }) });
  assert.equal((await register()).status, 201);
  const response = await register({ ...validBook, title: 'Otro' });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
});

test('unauthenticated requests cannot bypass the default API rate limit', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await app.request('/api/books', {
      rawBody: '{',
      headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' },
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'UNAUTHENTICATED');
  }
  const response = await app.request('/api/books', { body: validBook });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 0);
});

test('database failures use the existing safe central error response', async t => {
  const { app, register } = await setup(t);
  app.db.exec("CREATE TRIGGER reject_book BEFORE INSERT ON books BEGIN SELECT RAISE(ABORT, 'private database detail'); END");
  const response = await register();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(body).includes('private database detail'), false);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 0);
});

test('real authentication retains login, admin access, session regeneration and logout', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  assert.equal((await app.request('/admin/', { method: 'GET' })).status, 302);
  const { response, cookie } = await app.login();
  assert.deepEqual(await response.json(), { data: { username: app.credentials.username } });
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal((await app.request('/admin/', { method: 'GET', cookie })).status, 200);
  const second = await app.request('/api/auth/login', { body: app.credentials, cookie });
  const newCookie = second.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookie, newCookie);
  assert.equal((await app.request('/api/books', { body: validBook, cookie })).status, 401);
  assert.equal((await app.request('/api/books', { body: validBook, cookie: newCookie })).status, 201);
  assert.equal((await app.request('/api/auth/logout', { cookie: newCookie })).status, 204);
  assert.equal((await app.request('/api/books', { body: validBook, cookie: newCookie })).status, 401);
});

test('incorrect login and deleted accounts cannot register books', async t => {
  const { app, cookie, register } = await setup(t);
  for (const body of [{ username: app.credentials.username, password: 'incorrect-password' }, { username: 'nonexistent', password: 'incorrect-password' }]) {
    const response = await app.request('/api/auth/login', { body });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'INVALID_CREDENTIALS');
  }
  app.db.prepare('DELETE FROM administrators').run();
  assert.equal((await register(validBook, { cookie })).status, 401);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 0);
});

test('expired real sessions cannot register books', async t => {
  const { register } = await setup(t, { sessionOptions: { maxAgeMs: 50 } });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal((await register()).status, 401);
});

test('database initialization is idempotent and schema_migrations starts empty', async t => {
  const { app, register } = await setup(t);
  assert.equal((await register()).status, 201);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 0);
  const env = { ...process.env, NODE_ENV: 'test', PORT: '12345', DATABASE_PATH: app.env.databasePath, SESSIONS_DIR: app.env.sessionsDir, SESSIONS_DB: app.env.sessionsDb, SESSION_SECRET: app.env.sessionSecret, ALLOWED_ORIGIN: app.env.allowedOrigin };
  for (let i = 0; i < 2; i += 1) {
    const result = spawnSync(process.execPath, ['scripts/init-db.js'], { cwd: new URL('../../', import.meta.url), env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM administrators').get().n, 1);
  assert.equal(app.db.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(app.db.pragma('journal_mode', { simple: true }), 'wal');
});

test('the server requires an initialized database and serves registration with the valid schema', { timeout: 15000 }, async t => {
  const { app } = await setup(t);
  const missing = join(app.env.sessionsDir, 'absent.sqlite');
  const incomplete = join(app.env.sessionsDir, 'incomplete.sqlite');
  const database = openDatabase(incomplete);
  database.exec('CREATE TABLE administrators (id INTEGER PRIMARY KEY)');
  database.close();
  for (const databasePath of [missing, incomplete]) {
    const env = { ...process.env, NODE_ENV: 'test', PORT: '12345', DATABASE_PATH: databasePath, SESSIONS_DIR: app.env.sessionsDir, SESSIONS_DB: app.env.sessionsDb, SESSION_SECRET: app.env.sessionSecret, ALLOWED_ORIGIN: app.env.allowedOrigin };
    const result = spawnSync(process.execPath, ['src/server.js'], { cwd: new URL('../../', import.meta.url), env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /npm run db:init/);
  }
  assert.equal(existsSync(missing), false);
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('../../', import.meta.url),
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), DATABASE_PATH: app.env.databasePath, SESSIONS_DIR: app.env.sessionsDir, SESSIONS_DB: 'server-sessions.sqlite', SESSION_SECRET: app.env.sessionSecret, ALLOWED_ORIGIN: app.env.allowedOrigin },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await Promise.race([
      once(server.stdout, 'data'),
      once(server, 'exit').then(([code]) => { throw new Error(`Server exited before listening: ${code}`); }),
    ]);
    const request = (path, body, cookie) => fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { Origin: app.env.allowedOrigin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    const login = await request('/api/auth/login', app.credentials);
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const registered = await request('/api/books', validBook, cookie);
    assert.equal(registered.status, 201);
    assert.equal((await registered.json()).data.title, validBook.title);
  } finally {
    // Stop the child server before the temporary directory is removed. The hooks registered
    // with t.after run in registration order, so app.close() (from setup) would run first and
    // try to delete files that the child process still has open (EBUSY on Windows).
    if (server.exitCode === null && server.signalCode === null) {
      server.kill();
      await once(server, 'exit');
    }
  }
});
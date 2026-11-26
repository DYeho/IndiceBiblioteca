import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applySchema, openDatabase } from '../../src/database/conection.js';
import { createTestApp } from '../test-app.js';

const DEFAULT_CATEGORIES = [
  'Literatura',
  'Matemáticas',
  'Ciencias naturales',
  'Ciencias sociales',
  'Historia y geografía',
  'Arte y cultura',
  'Tecnología e informática',
  'Idiomas',
  'Referencia y consulta',
  'Otros',
];

test('lists the initial categories without requiring an administrator session', async t => {
  const app = await createTestApp();
  t.after(() => app.close());

  const response = await app.request('/api/categories', { method: 'GET' });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.map(category => category.name).sort(), [...DEFAULT_CATEGORIES].sort());
});

test('creates categories only for administrators and rejects normalized duplicates', async t => {
  const app = await createTestApp();
  t.after(() => app.close());

  const unauthenticated = await app.request('/api/categories', {
    rawBody: '{',
    headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' },
  });
  assert.equal(unauthenticated.status, 401);

  const { cookie } = await app.login();
  const created = await app.request('/api/categories', { body: { name: '  Filosofía  ' }, cookie });
  assert.equal(created.status, 201);
  const { data: category } = await created.json();
  assert.equal(category.name, 'Filosofía');

  const duplicate = await app.request('/api/categories', { body: { name: ' FILOSOFIA ' }, cookie });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.message, 'Ya existe una categoría con ese nombre.');
  assert.equal(app.db.prepare('SELECT count(*) AS total FROM categories WHERE normalized_name = ?').get('filosofia').total, 1);

  await app.restart();
  const persisted = await app.request('/api/categories', { method: 'GET' });
  assert.ok((await persisted.json()).data.some(item => item.id === category.id && item.name === category.name));
});

test('validates category names and requires a real category when saving a book', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  const { cookie } = await app.login();

  for (const name of ['', '  ', '\u0301', 42, 'C'.repeat(61)]) {
    const response = await app.request('/api/categories', { body: { name }, cookie });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error.fields.name);
  }

  const validBook = { title: 'Libro de prueba', author: 'Autora', quantity: 1 };
  for (const categoryId of [undefined, null, 0, '1', 999999]) {
    const body = { ...validBook, ...(categoryId === undefined ? {} : { categoryId }) };
    const response = await app.request('/api/books', { body, cookie });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error.fields.categoryId);
  }
  assert.equal(app.db.prepare('SELECT count(*) AS total FROM books').get().total, 0);
});

test('book registration, editing and public search preserve the chosen category', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  const { cookie } = await app.login();
  const categories = await (await app.request('/api/categories', { method: 'GET' })).json();
  const literature = categories.data.find(category => category.name === 'Literatura');
  const history = categories.data.find(category => category.name === 'Historia y geografía');

  const registered = await app.request('/api/books', {
    body: { title: 'Libro categorizado', author: 'Autora', quantity: 1, categoryId: literature.id },
    cookie,
  });
  assert.equal(registered.status, 201);
  const { data: book } = await registered.json();
  assert.equal(book.categoryId, literature.id);
  assert.equal(book.category, 'Literatura');

  const edited = await app.request(`/api/books/${book.id}`, {
    method: 'PUT',
    body: { title: book.title, author: book.author, quantity: book.quantity, categoryId: history.id },
    cookie,
  });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).data.category, 'Historia y geografía');

  const search = await app.request('/api/books?q=categorizado', { method: 'GET' });
  assert.equal((await search.json()).data[0].category, 'Historia y geografía');
  await app.restart();
  const persistedSearch = await app.request('/api/books?q=categorizado', { method: 'GET' });
  assert.equal((await persistedSearch.json()).data[0].category, 'Historia y geografía');
});

test('migrates existing books to Otros and remains idempotent', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'category-migration-test-'));
  const database = openDatabase(join(directory, 'library.sqlite'));
  t.after(async () => {
    database.close();
    await rm(directory, { recursive: true, force: true });
  });

  database.exec(`
    CREATE TABLE books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
      author TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 150),
      description TEXT,
      quantity INTEGER NOT NULL,
      shelf_label TEXT,
      title_normalized TEXT NOT NULL,
      author_normalized TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (title_normalized, author_normalized)
    );
    INSERT INTO books (
      title, author, description, quantity, shelf_label,
      title_normalized, author_normalized, created_at, updated_at
    ) VALUES ('Libro anterior', 'Autora anterior', NULL, 2, NULL,
              'libro anterior', 'autora anterior', '2026-01-01', '2026-01-01');
  `);

  applySchema(database);
  applySchema(database);
  const migrated = database.prepare(`
    SELECT books.id, books.title, categories.name AS category
    FROM books JOIN categories ON categories.id = books.category_id
  `).get();
  assert.deepEqual(migrated, { id: 1, title: 'Libro anterior', category: 'Otros' });
  assert.equal(database.pragma('table_info(books)').find(column => column.name === 'category_id').notnull, 1);
  assert.equal(database.prepare('SELECT name FROM schema_migrations').get().name, '001-book-categories');
  assert.throws(
    () => database.prepare('UPDATE books SET category_id = NULL').run(),
    error => error.code === 'SQLITE_CONSTRAINT_NOTNULL',
  );
  assert.throws(
    () => database.prepare('UPDATE books SET category_id = 999999').run(),
    error => error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY',
  );
});

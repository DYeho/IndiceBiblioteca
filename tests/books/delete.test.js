import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestApp } from '../test-app.js';

const NO_SESSION = { error: { code: 'UNAUTHENTICATED', message: 'Debe iniciar sesión.' } };
const BOOK_NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'El libro no existe.' } };
const INVALID_IDS = ['999999', 'abc', '0', '-1', '1.5', '1e3', '01'];

async function setup(t, options) {
  const app = await createTestApp(options);
  t.after(() => app.close());
  const { cookie } = await app.login();
  const categoryId = app.db.prepare('SELECT id FROM categories WHERE normalized_name = ?').get('literatura').id;
  const register = async (title, author = 'Autora de prueba', quantity = 3) => {
    const response = await app.request('/api/books', { body: { title, author, quantity, categoryId }, cookie });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  };
  const remove = (id, extra = {}) => app.request(`/api/books/${id}`, { method: 'DELETE', cookie, ...extra });
  const read = id => app.request(`/api/books/${id}`, { method: 'GET', cookie });
  const assignShelf = (id, shelfLabel) => app.request(`/api/books/${id}/shelf`, { method: 'PUT', body: { shelfLabel }, cookie });
  const search = async text => {
    const response = await app.request(`/api/books?q=${encodeURIComponent(text)}`, { method: 'GET' });
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  const list = async status => {
    const response = await app.request(`/api/shelf-assignments?status=${status}`, { method: 'GET', cookie });
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  const rows = () => app.db.prepare('SELECT * FROM books ORDER BY id').all();
  const row = id => app.db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  return { app, cookie, register, remove, read, assignShelf, search, list, rows, row };
}

test('PF-01 rejects DELETE without a valid session and the book still exists', async t => {
  const { app, register, rows, row } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  for (const cookie of [undefined, 'ib.sid=inventada']) {
    const response = await app.request(`/api/books/${book.id}`, { method: 'DELETE', cookie });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), NO_SESSION);
    const hostile = await app.request(`/api/books/${book.id}`, {
      method: 'DELETE',
      cookie,
      headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' },
    });
    assert.equal(hostile.status, 401);
  }
  assert.ok(row(book.id));
  assert.deepEqual(rows(), before);
});

test('PF-02 deleting a book with copies returns 204 without a body; GET by id gives 404 and search no longer finds it', async t => {
  const { register, remove, read, search } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 5);
  const response = await remove(book.id);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  const afterRead = await read(book.id);
  assert.equal(afterRead.status, 404);
  assert.deepEqual(await afterRead.json(), BOOK_NOT_FOUND);
  assert.deepEqual(await search('Rayuela'), []);
});

test('PF-03 deleting a book with quantity 0 returns 204', async t => {
  const { app, register, remove, row } = await setup(t);
  const book = await register('Agotado', 'Autor', 1);
  app.db.prepare('UPDATE books SET quantity = 0 WHERE id = ?').run(book.id);
  assert.equal(row(book.id).quantity, 0);
  const response = await remove(book.id);
  assert.equal(response.status, 204);
  assert.equal(row(book.id), undefined);
});

test('PF-04 after reopening the database and the app, the book still does not exist', async t => {
  const { app, register, remove, row } = await setup(t);
  const book = await register('Rayuela');
  assert.equal((await remove(book.id)).status, 204);
  await app.restart();
  assert.equal(row(book.id), undefined);
  const { cookie } = await app.login();
  const response = await app.request(`/api/books/${book.id}`, { method: 'GET', cookie });
  assert.equal(response.status, 404);
});

test('PF-05 deleting a missing, already deleted or invalid id returns 404 and changes nothing', async t => {
  const { register, remove, rows } = await setup(t);
  const kept = await register('Se conserva');
  const deleted = await register('Se elimina');
  assert.equal((await remove(deleted.id)).status, 204);
  const before = rows();
  for (const id of [deleted.id, ...INVALID_IDS]) {
    const response = await remove(id);
    assert.equal(response.status, 404, `id ${id}`);
    assert.deepEqual(await response.json(), BOOK_NOT_FOUND);
  }
  assert.deepEqual(rows(), before);
  assert.equal(rows()[0].id, kept.id);
});

test('PF-06 deleting a book does not modify the other books', async t => {
  const { register, remove, rows } = await setup(t);
  const first = await register('Primero', 'Autor A');
  const target = await register('Objetivo', 'Autor B');
  const third = await register('Tercero', 'Autor C');
  const before = rows().filter(r => r.id !== target.id);
  assert.equal((await remove(target.id)).status, 204);
  assert.deepEqual(rows(), before);
  assert.deepEqual(rows().map(r => r.id), [first.id, third.id]);
});

test('PF-07 the deleted book appears in neither assignment list nor in the search', async t => {
  const { register, remove, assignShelf, list, search } = await setup(t);
  const placed = await register('Con estante', 'Autor');
  const loose = await register('Sin estante', 'Autor');
  assert.equal((await assignShelf(placed.id, 'A-1')).status, 200);
  assert.equal((await remove(placed.id)).status, 204);
  assert.equal((await remove(loose.id)).status, 204);
  assert.deepEqual(await list('assigned'), []);
  assert.deepEqual(await list('unassigned'), []);
  assert.deepEqual(await search('estante'), []);
});

test('PF-08 the same title and author can be registered again after deleting', async t => {
  const { app, cookie, register, remove } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 2);
  assert.equal((await remove(book.id)).status, 204);
  const response = await app.request('/api/books', { body: { title: 'rayuela', author: 'JULIO CORTAZAR', quantity: 4, categoryId: 1 }, cookie });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.notEqual(data.id, book.id);
  assert.equal(data.quantity, 4);
});

test('PF-09 a book with a shelf is deleted completely: no row remains with its id', async t => {
  const { app, register, remove, assignShelf } = await setup(t);
  const book = await register('Con estante', 'Autor');
  assert.equal((await assignShelf(book.id, 'B-2')).status, 200);
  assert.equal((await remove(book.id)).status, 204);
  const count = app.db.prepare('SELECT COUNT(*) AS total FROM books WHERE id = ?').get(book.id).total;
  assert.equal(count, 0);
});

test('PF-10 a different Origin returns 403 and the book still exists', async t => {
  const { register, remove, row } = await setup(t);
  const book = await register('Rayuela');
  const response = await remove(book.id, { headers: { Origin: 'http://other.example' } });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'FORBIDDEN');
  assert.ok(row(book.id));
});

test('PF-11 DELETE /api/books without an id returns 404 and deletes nothing', async t => {
  const { app, cookie, register, rows } = await setup(t);
  await register('Uno', 'Autor A');
  await register('Dos', 'Autor B');
  const before = rows();
  for (const path of ['/api/books', '/api/books/']) {
    const response = await app.request(path, { method: 'DELETE', cookie });
    assert.equal(response.status, 404, path);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  }
  assert.deepEqual(rows(), before);
});
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestApp } from '../test-app.js';

const OLD_DATE = '2026-01-01T00:00:00.000Z';
const NO_SESSION = { error: { code: 'UNAUTHENTICATED', message: 'Debe iniciar sesión.' } };
const BOOK_NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'El libro no existe.' } };
const STATUS_MESSAGE = 'Indique si desea los libros sin estante o con estante.';
const LIST_FIELDS = ['author', 'id', 'quantity', 'shelfLabel', 'title'];
const BOOK_FIELDS = ['author', 'category', 'categoryId', 'createdAt', 'description', 'id', 'quantity', 'shelfLabel', 'title', 'updatedAt'];

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
  const list = status => app.request(`/api/shelf-assignments?status=${status}`, { method: 'GET', cookie });
  const listData = async status => {
    const response = await list(status);
    assert.equal(response.status, 200);
    return response.json();
  };
  const assign = (id, body, extra = {}) => app.request(`/api/books/${id}/shelf`, { method: 'PUT', body, cookie, ...extra });
  const rows = () => app.db.prepare('SELECT * FROM books ORDER BY id').all();
  return { app, cookie, register, list, listData, assign, rows };
}

test('PD-01 rejects both shelf endpoints without a valid session and changes nothing', async t => {
  const { app, register, rows } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  for (const cookie of [undefined, 'ib.sid=inventada']) {
    for (const status of ['unassigned', 'assigned']) {
      const response = await app.request(`/api/shelf-assignments?status=${status}`, { method: 'GET', cookie });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), NO_SESSION);
    }
    const response = await app.request(`/api/books/${book.id}/shelf`, { method: 'PUT', body: { shelfLabel: 'A-1' }, cookie });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), NO_SESSION);
    const hostile = await app.request(`/api/books/${book.id}/shelf`, { method: 'PUT', rawBody: '{', cookie, headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' } });
    assert.equal(hostile.status, 401);
  }
  assert.deepEqual(rows(), before);
});

test('PD-02 unassigned lists only books without a shelf, with the list fields, ordered, with total', async t => {
  const { register, assign, listData } = await setup(t);
  await register('Zorro', 'Autor Z');
  await register('árbol', 'Autor A');
  await register('Banana', 'Autor B');
  await register('Rayuela', 'Zeta');
  await register('Rayuela', 'Alfa');
  const placed = await register('Aaa', 'Autor');
  assert.equal((await assign(placed.id, { shelfLabel: 'A-1' })).status, 200);
  const body = await listData('unassigned');
  assert.deepEqual(body.data.map(book => `${book.title}/${book.author}`), ['árbol/Autor A', 'Banana/Autor B', 'Rayuela/Alfa', 'Rayuela/Zeta', 'Zorro/Autor Z']);
  assert.equal(body.meta.total, 5);
  for (const book of body.data) {
    assert.deepEqual(Object.keys(book).sort(), LIST_FIELDS);
    assert.equal(book.shelfLabel, null);
  }
});

test('PD-03 a newly registered book is unassigned and not assigned', async t => {
  const { register, listData } = await setup(t);
  const book = await register('Rayuela');
  assert.equal(book.shelfLabel, null);
  assert.deepEqual((await listData('unassigned')).data.map(item => item.id), [book.id]);
  assert.deepEqual(await listData('assigned'), { data: [], meta: { total: 0 } });
});

test('PD-04 returns 200 with an empty list and total 0 for an empty catalog or an empty list', async t => {
  const { register, assign, listData } = await setup(t);
  assert.deepEqual(await listData('unassigned'), { data: [], meta: { total: 0 } });
  assert.deepEqual(await listData('assigned'), { data: [], meta: { total: 0 } });
  const book = await register('Rayuela');
  assert.equal((await assign(book.id, { shelfLabel: 'A-1' })).status, 200);
  assert.deepEqual(await listData('unassigned'), { data: [], meta: { total: 0 } });
});

test('PD-05 a book with quantity 0 appears in the list that corresponds to it', async t => {
  const { app, register, assign, listData } = await setup(t);
  const book = await register('Rayuela');
  app.db.prepare('UPDATE books SET quantity = 0 WHERE id = ?').run(book.id);
  const unassigned = await listData('unassigned');
  assert.deepEqual(unassigned.data.map(item => [item.id, item.quantity]), [[book.id, 0]]);
  assert.equal((await assign(book.id, { shelfLabel: 'A-1' })).status, 200);
  assert.deepEqual((await listData('unassigned')).data, []);
  assert.deepEqual((await listData('assigned')).data.map(item => [item.id, item.quantity]), [[book.id, 0]]);
});

test('PD-06 assigns a valid shelf, trims it, moves the book between lists and changes nothing else', async t => {
  const { register, assign, listData, rows } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 7);
  const other = await register('El principito');
  const otherBefore = rows().find(row => row.id === other.id);
  const response = await assign(book.id, { shelfLabel: '  Estante A-3  ' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data).sort(), BOOK_FIELDS);
  assert.equal(data.shelfLabel, 'Estante A-3');
  for (const field of ['id', 'title', 'author', 'description', 'quantity', 'createdAt']) {
    assert.deepEqual(data[field], book[field]);
  }
  assert.deepEqual(rows().find(row => row.id === other.id), otherBefore);
  assert.deepEqual((await listData('unassigned')).data.map(item => item.id), [other.id]);
  assert.deepEqual((await listData('assigned')).data.map(item => [item.id, item.shelfLabel]), [[book.id, 'Estante A-3']]);
});

test('PD-07 keeps the shelf after reopening the database and the application', async t => {
  const { app, register, assign, list, cookie } = await setup(t);
  const book = await register('Rayuela');
  assert.equal((await assign(book.id, { shelfLabel: 'B-2' })).status, 200);
  await app.restart();
  assert.equal(app.db.prepare('SELECT shelf_label FROM books WHERE id = ?').get(book.id).shelf_label, 'B-2');
  const response = await app.request('/api/shelf-assignments?status=assigned', { method: 'GET', cookie });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.map(item => item.shelfLabel), ['B-2']);
  assert.equal(typeof list, 'function');
});

test('PD-08 rejects an absent, null, empty or whitespace label and keeps the previous state', async t => {
  const { register, assign, rows } = await setup(t);
  const withoutShelf = await register('Sin estante', 'Autor 1');
  const withShelf = await register('Con estante', 'Autor 2');
  assert.equal((await assign(withShelf.id, { shelfLabel: 'C-1' })).status, 200);
  const before = rows();
  for (const id of [withoutShelf.id, withShelf.id]) {
    for (const body of [{}, { shelfLabel: null }, { shelfLabel: '' }, { shelfLabel: '   ' }, { shelfLabel: '\n\t' }, undefined]) {
      const response = await assign(id, body);
      assert.equal(response.status, 400);
      const { error } = await response.json();
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.fields.shelfLabel, 'El estante es obligatorio.');
    }
  }
  assert.deepEqual(rows(), before);
});

test('PD-09 accepts a 30-character label and rejects 31 characters', async t => {
  const { register, assign, rows } = await setup(t);
  const book = await register('Rayuela');
  for (const label of ['A'.repeat(30), '📚'.repeat(30)]) {
    const response = await assign(book.id, { shelfLabel: label });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.shelfLabel, label);
  }
  const before = rows();
  for (const label of ['A'.repeat(31), '📚'.repeat(31), ` ${'A'.repeat(31)} `]) {
    const response = await assign(book.id, { shelfLabel: label });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.fields.shelfLabel, 'El estante no puede superar 30 caracteres.');
  }
  assert.deepEqual(rows(), before);
});

test('PD-10 rejects a label that is not text', async t => {
  const { register, assign, rows } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  for (const shelfLabel of [5, 0, true, {}, { a: 1 }, [], ['A-1']]) {
    const response = await assign(book.id, { shelfLabel });
    assert.equal(response.status, 400);
    const { error } = await response.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.fields.shelfLabel, 'El estante debe ser texto.');
  }
  assert.deepEqual(rows(), before);
});

test('PD-11 returns 404 for a missing book or an invalid id, and nothing changes', async t => {
  const { app, register, assign, rows } = await setup(t);
  const deleted = await register('Eliminado');
  await register('Presente', 'Otra persona');
  app.db.prepare('DELETE FROM books WHERE id = ?').run(deleted.id);
  const before = rows();
  for (const id of [deleted.id, '999999', 'abc', '0', '-1', '1.5', '1e3', '01']) {
    const response = await assign(id, { shelfLabel: 'A-1' });
    assert.equal(response.status, 404, `id ${id}`);
    assert.deepEqual(await response.json(), BOOK_NOT_FOUND);
  }
  const invalidBody = await assign('999999', { shelfLabel: '' });
  assert.equal(invalidBody.status, 404);
  assert.deepEqual(rows(), before);
});

test('PD-12 assigned lists the books with a shelf, with the current label and the same order', async t => {
  const { register, assign, listData } = await setup(t);
  const zorro = await register('Zorro', 'Autor Z');
  const arbol = await register('árbol', 'Autor A');
  const banana = await register('Banana', 'Autor B');
  await register('Sin estante', 'Autor S');
  for (const [book, label] of [[zorro, 'Z-1'], [arbol, 'A-1'], [banana, 'B-1']]) {
    assert.equal((await assign(book.id, { shelfLabel: label })).status, 200);
  }
  assert.equal((await assign(banana.id, { shelfLabel: 'B-2' })).status, 200);
  const body = await listData('assigned');
  assert.deepEqual(body.data.map(book => [book.title, book.shelfLabel]), [['árbol', 'A-1'], ['Banana', 'B-2'], ['Zorro', 'Z-1']]);
  assert.equal(body.meta.total, 3);
  for (const book of body.data) assert.deepEqual(Object.keys(book).sort(), LIST_FIELDS);
});

test('PD-13 a different label replaces the previous one and only updatedAt changes', async t => {
  const { app, register, assign, rows } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 4);
  const other = await register('El principito');
  assert.equal((await assign(book.id, { shelfLabel: 'A-1' })).status, 200);
  app.db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(OLD_DATE, book.id);
  const otherBefore = rows().find(row => row.id === other.id);
  const response = await assign(book.id, { shelfLabel: 'B-9' });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.shelfLabel, 'B-9');
  assert.notEqual(data.updatedAt, OLD_DATE);
  assert.equal(data.createdAt, book.createdAt);
  for (const field of ['id', 'title', 'author', 'description', 'quantity']) {
    assert.deepEqual(data[field], book[field]);
  }
  assert.deepEqual(rows().find(row => row.id === other.id), otherBefore);
});

test('PD-14 assigning the same label, even with extra spaces, succeeds without changing updatedAt', async t => {
  const { app, register, assign } = await setup(t);
  const book = await register('Rayuela');
  const first = await (await assign(book.id, { shelfLabel: 'A-1' })).json();
  app.db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(OLD_DATE, book.id);
  for (const label of ['A-1', '  A-1', 'A-1  ', '  A-1  ']) {
    const response = await assign(book.id, { shelfLabel: label });
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.shelfLabel, 'A-1');
    assert.equal(data.updatedAt, OLD_DATE);
  }
  assert.equal(first.data.shelfLabel, 'A-1');
});

test('PD-15 stores uppercase letters and inner spaces exactly as written', async t => {
  const { app, register, assign } = await setup(t);
  const book = await register('Rayuela');
  const response = await assign(book.id, { shelfLabel: ' Pasillo  2 ' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.shelfLabel, 'Pasillo  2');
  assert.equal((await assign(book.id, { shelfLabel: 'ESTANTE b-3 Ñandú' })).status, 200);
  assert.equal(app.db.prepare('SELECT shelf_label FROM books WHERE id = ?').get(book.id).shelf_label, 'ESTANTE b-3 Ñandú');
});

test('PD-16 rejects an absent, repeated or unknown status with fields.status', async t => {
  const { app, cookie } = await setup(t);
  for (const query of ['', '?status=', '?status=todos', '?status=UNASSIGNED', '?status=assigned&status=unassigned', '?status=assigned&status=assigned']) {
    const response = await app.request(`/api/shelf-assignments${query}`, { method: 'GET', cookie });
    assert.equal(response.status, 400, query);
    const { error } = await response.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.fields.status, STATUS_MESSAGE);
  }
});

test('PD-17 allows two books to share the same label', async t => {
  const { register, assign, listData } = await setup(t);
  const first = await register('Rayuela', 'Autor 1');
  const second = await register('El principito', 'Autor 2');
  for (const book of [first, second]) {
    assert.equal((await assign(book.id, { shelfLabel: 'Compartido' })).status, 200);
  }
  const body = await listData('assigned');
  assert.deepEqual(body.data.map(book => book.shelfLabel), ['Compartido', 'Compartido']);
  assert.equal(body.meta.total, 2);
});

test('PD-18 returns 400 for malformed JSON, 403 for another origin and 400 for a non-JSON content type', async t => {
  const { register, assign, rows } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  let response = await assign(book.id, undefined, { rawBody: '{' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  response = await assign(book.id, { shelfLabel: 'A-1' }, { rawBody: JSON.stringify({ shelfLabel: 'A'.repeat(17000) }) });
  assert.equal(response.status, 400);
  for (const headers of [{ Origin: 'http://other.example' }, { Origin: undefined, Referer: undefined }]) {
    response = await assign(book.id, { shelfLabel: 'A-1' }, { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  }
  response = await assign(book.id, { shelfLabel: 'A-1' }, { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  assert.deepEqual(rows(), before);
  assert.equal((await assign(book.id, { shelfLabel: 'A-1' }, { headers: { Origin: undefined, Referer: 'http://localhost/admin/' } })).status, 200);
});

test('PD-19 SQLite rejects an empty or too long shelf_label directly', async t => {
  const { app, register } = await setup(t);
  await register('Rayuela');
  for (const value of ['', 'A'.repeat(31)]) {
    assert.throws(() => app.db.prepare('UPDATE books SET shelf_label = ?').run(value), error => error.code === 'SQLITE_CONSTRAINT_CHECK');
  }
  app.db.prepare('UPDATE books SET shelf_label = ?').run('A'.repeat(30));
  assert.equal(app.db.prepare('SELECT shelf_label FROM books').get().shelf_label.length, 30);
  app.db.prepare('UPDATE books SET shelf_label = NULL').run();
  assert.equal(app.db.prepare('SELECT shelf_label FROM books').get().shelf_label, null);
});

test('PD-20 the totals of both lists add up to all books and no book is in both', async t => {
  const { app, register, assign, listData } = await setup(t);
  const books = [];
  for (const title of ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']) books.push(await register(title));
  app.db.prepare('UPDATE books SET quantity = 0 WHERE id = ?').run(books[0].id);
  for (const book of [books[0], books[2]]) assert.equal((await assign(book.id, { shelfLabel: 'A-1' })).status, 200);
  const unassigned = await listData('unassigned');
  const assigned = await listData('assigned');
  const total = app.db.prepare('SELECT count(*) AS n FROM books').get().n;
  assert.equal(unassigned.meta.total + assigned.meta.total, total);
  const ids = [...unassigned.data, ...assigned.data].map(book => book.id);
  assert.equal(new Set(ids).size, total);
  assert.equal(ids.length, total);
});

test('shelf labels with HTML and SQL-like text are stored and returned as plain data', async t => {
  const { app, register, assign, listData } = await setup(t);
  const book = await register('Rayuela');
  const label = "<b>'; DROP TABLE books;--";
  const response = await assign(book.id, { shelfLabel: label });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.shelfLabel, label);
  assert.equal((await listData('assigned')).data[0].shelfLabel, label);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
});

test('database failures in the shelf endpoints use the safe central error response', async t => {
  const { app, register, assign } = await setup(t);
  const book = await register('Rayuela');
  app.db.exec("CREATE TRIGGER reject_shelf BEFORE UPDATE ON books BEGIN SELECT RAISE(ABORT, 'private database detail'); END");
  const response = await assign(book.id, { shelfLabel: 'A-1' });
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(body).includes('private database detail'), false);
});
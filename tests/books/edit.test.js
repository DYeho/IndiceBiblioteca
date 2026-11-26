import assert from 'node:assert/strict';
import test from 'node:test';
import { createBooksRepository } from '../../src/modules/books/books.repository.js';
import { createBooksService } from '../../src/modules/books/books.service.js';
import { normalizeText } from '../../src/utils/normalize-text.js';
import { createTestApp } from '../test-app.js';

const OLD_DATE = '2026-01-01T00:00:00.000Z';
const NO_SESSION = { error: { code: 'UNAUTHENTICATED', message: 'Debe iniciar sesión.' } };
const BOOK_NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'El libro no existe.' } };
const DUPLICATE = { error: { code: 'CONFLICT', message: 'Ese libro ya existe. Edite el libro existente.' } };
const QUANTITY_MESSAGE = 'La cantidad debe ser un número entero entre 0 y 999.';
const SHELF_MESSAGE = 'El estante no se modifica desde la edición. Use “Asignar estantes”.';
const BOOK_FIELDS = ['author', 'category', 'categoryId', 'createdAt', 'description', 'id', 'quantity', 'shelfLabel', 'title', 'updatedAt'];
const INVALID_IDS = ['999999', 'abc', '0', '-1', '1.5', '1e3', '01'];

async function setup(t, options) {
  const app = await createTestApp(options);
  t.after(() => app.close());
  const { cookie } = await app.login();
  const categoryId = app.db.prepare('SELECT id FROM categories WHERE normalized_name = ?').get('literatura').id;
  const register = async (title, author = 'Autora de prueba', quantity = 3, description) => {
    const body = { title, author, quantity, categoryId, ...(description === undefined ? {} : { description }) };
    const response = await app.request('/api/books', { body, cookie });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  };
  const read = (id, extra = {}) => app.request(`/api/books/${id}`, { method: 'GET', cookie, ...extra });
  const edit = (id, body, extra = {}) => app.request(`/api/books/${id}`, { method: 'PUT', body: { categoryId, ...body }, cookie, ...extra });
  const assignShelf = (id, shelfLabel) => app.request(`/api/books/${id}/shelf`, { method: 'PUT', body: { shelfLabel }, cookie });
  const search = async text => {
    const response = await app.request(`/api/books?q=${encodeURIComponent(text)}`, { method: 'GET' });
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  const rows = () => app.db.prepare('SELECT * FROM books ORDER BY id').all();
  const row = id => app.db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  const valid = (overrides = {}) => ({ title: 'Título nuevo', author: 'Autor nuevo', description: 'Descripción nueva', quantity: 5, categoryId, ...overrides });
  return { app, cookie, register, read, edit, assignShelf, search, rows, row, valid };
}

test('PE-01 rejects GET and PUT without a valid session and changes nothing', async t => {
  const { app, register, rows, valid } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  for (const cookie of [undefined, 'ib.sid=inventada']) {
    const read = await app.request(`/api/books/${book.id}`, { method: 'GET', cookie });
    assert.equal(read.status, 401);
    assert.deepEqual(await read.json(), NO_SESSION);
    const write = await app.request(`/api/books/${book.id}`, { method: 'PUT', body: valid(), cookie });
    assert.equal(write.status, 401);
    assert.deepEqual(await write.json(), NO_SESSION);
    const hostile = await app.request(`/api/books/${book.id}`, { method: 'PUT', rawBody: '{', cookie, headers: { Origin: 'http://other.example', 'Content-Type': 'text/plain' } });
    assert.equal(hostile.status, 401);
  }
  assert.deepEqual(rows(), before);
});

test('PE-02 GET returns the complete book, with a null description when it has none', async t => {
  const { register, read } = await setup(t);
  const plain = await register('Rayuela', 'Julio Cortázar', 7);
  const described = await register('El principito', 'Antoine de Saint-Exupéry', 2, 'Un príncipe pequeño');
  for (const book of [plain, described]) {
    const response = await read(book.id);
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.deepEqual(Object.keys(data).sort(), BOOK_FIELDS);
    assert.deepEqual(data, book);
  }
  assert.equal((await (await read(plain.id)).json()).data.description, null);
  assert.equal((await (await read(described.id)).json()).data.description, 'Un príncipe pequeño');
});

test('PE-03 GET returns 404 for a missing book or an invalid id', async t => {
  const { app, register, read } = await setup(t);
  const deleted = await register('Eliminado');
  app.db.prepare('DELETE FROM books WHERE id = ?').run(deleted.id);
  for (const id of [deleted.id, ...INVALID_IDS]) {
    const response = await read(id);
    assert.equal(response.status, 404, `id ${id}`);
    assert.deepEqual(await response.json(), BOOK_NOT_FOUND);
  }
});

test('PE-04 a valid edit returns the trimmed data and keeps it after reopening the database', async t => {
  const { app, register, read, edit, row, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 7, 'Novela');
  const response = await edit(book.id, { title: '  Cien años  ', author: ' G. García Márquez ', description: ' Otra novela ', quantity: 8 });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(Object.keys(data).sort(), BOOK_FIELDS);
  assert.deepEqual(
    [data.title, data.author, data.description, data.quantity],
    ['Cien años', 'G. García Márquez', 'Otra novela', 8],
  );
  assert.deepEqual((await (await read(book.id)).json()).data, data);

  for (const change of [{ title: 'Solo título' }, { author: 'Solo autor' }, { description: 'Solo descripción' }, { quantity: 1 }]) {
    const current = (await (await read(book.id)).json()).data;
    const body = { title: current.title, author: current.author, description: current.description, quantity: current.quantity, ...change };
    const partial = await edit(book.id, body);
    assert.equal(partial.status, 200);
    assert.deepEqual((await partial.json()).data[Object.keys(change)[0]], Object.values(change)[0]);
  }

  const saved = await (await edit(book.id, valid({ quantity: 12 }))).json();
  await app.restart();
  const stored = row(book.id);
  assert.deepEqual(
    [stored.title, stored.author, stored.description, stored.quantity],
    [saved.data.title, saved.data.author, saved.data.description, 12],
  );
});

test('PE-05 quantity 0 is saved, the book stays registered and the search shows it with 0', async t => {
  const { app, register, read, edit, search, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 4);
  const response = await edit(book.id, valid({ title: 'Rayuela', author: 'Julio Cortázar', quantity: 0 }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.quantity, 0);
  assert.equal((await (await read(book.id)).json()).data.quantity, 0);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
  const found = await search('rayuela');
  assert.deepEqual(found.map(item => [item.id, item.quantity]), [[book.id, 0]]);
});

test('PE-06 rejects a missing, empty or whitespace title or author and a missing quantity', async t => {
  const { register, edit, rows, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar');
  const before = rows();
  const cases = [
    ['title', 'El título es obligatorio.'],
    ['author', 'El autor es obligatorio.'],
  ];
  for (const [name, message] of cases) {
    for (const value of [undefined, '', '   ', '\n\t', '́']) {
      const response = await edit(book.id, valid({ [name]: value }));
      assert.equal(response.status, 400);
      const { error } = await response.json();
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(error.fields, { [name]: message });
    }
  }
  const missingQuantity = await edit(book.id, valid({ quantity: undefined }));
  assert.equal(missingQuantity.status, 400);
  assert.deepEqual((await missingQuantity.json()).error.fields, { quantity: 'La cantidad es obligatoria.' });

  const empty = await edit(book.id, {});
  assert.equal(empty.status, 400);
  assert.deepEqual((await empty.json()).error.fields, {
    title: 'El título es obligatorio.',
    author: 'El autor es obligatorio.',
    quantity: 'La cantidad es obligatoria.',
  });
  assert.deepEqual(rows(), before);
});

test('PE-07 rejects invalid quantities and accepts the limits 0 and 999', async t => {
  const { register, edit, rows, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar');
  const before = rows();
  for (const quantity of [-1, 1.5, '5', 'abc', null, 1000, true, [], {}]) {
    const response = await edit(book.id, valid({ quantity }));
    assert.equal(response.status, 400, JSON.stringify(quantity));
    const { error } = await response.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.fields.quantity, QUANTITY_MESSAGE);
  }
  assert.deepEqual(rows(), before);
  for (const quantity of [0, 999]) {
    const response = await edit(book.id, valid({ quantity }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.quantity, quantity);
  }
});

test('PE-08 enforces the length limits of title, author and description', async t => {
  const { register, edit, rows, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar');
  const limits = [
    ['title', 200, 'El título no puede superar 200 caracteres.'],
    ['author', 150, 'El autor no puede superar 150 caracteres.'],
    ['description', 2000, 'La descripción no puede superar 2000 caracteres.'],
  ];
  for (const [name, limit, message] of limits) {
    for (const accepted of ['A'.repeat(limit), '📚'.repeat(limit), ` ${'B'.repeat(limit)} `]) {
      const response = await edit(book.id, valid({ [name]: accepted }));
      assert.equal(response.status, 200, `${name} ${limit}`);
      assert.equal((await response.json()).data[name], accepted.trim());
    }
    const before = rows();
    for (const rejected of ['A'.repeat(limit + 1), '📚'.repeat(limit + 1)]) {
      const response = await edit(book.id, valid({ [name]: rejected }));
      assert.equal(response.status, 400, `${name} ${limit + 1}`);
      assert.equal((await response.json()).error.fields[name], message);
    }
    assert.deepEqual(rows(), before);
  }
});

test('PE-09 an absent, null, empty or whitespace description is saved as null and clears the old one', async t => {
  const { register, edit, row, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 3, 'Descripción anterior');
  const { description: omitted, ...withoutDescription } = valid();
  assert.equal(omitted, 'Descripción nueva');
  for (const body of [withoutDescription, valid({ description: null }), valid({ description: '' }), valid({ description: '   ' }), valid({ description: '\n\t' })]) {
    assert.equal((await edit(book.id, valid({ description: 'Descripción anterior' }))).status, 200);
    assert.equal(row(book.id).description, 'Descripción anterior');
    const response = await edit(book.id, body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.description, null);
    assert.equal(row(book.id).description, null);
  }
});

test('PE-10 changing title or author to match another book is a 409 and nothing changes', async t => {
  const { register, edit, rows } = await setup(t);
  await register('Rayuela', 'Julio Cortázar');
  const principito = await register('El principito', 'Antoine de Saint-Exupéry');
  const sameAuthor = await register('Otro título', 'Julio Cortázar');
  const sameTitle = await register('Rayuela', 'Otra persona');
  const before = rows();
  for (const [title, author] of [
    ['Rayuela', 'Julio Cortázar'],
    ['RAYUELA', 'JULIO CORTAZAR'],
    ['  rayuela ', 'julio   cortázar'],
    ['Rayuelá', 'Julio Cortazar'],
  ]) {
    const response = await edit(principito.id, { title, author, quantity: 1 });
    assert.equal(response.status, 409, `${title}/${author}`);
    assert.deepEqual(await response.json(), DUPLICATE);
  }
  let response = await edit(sameAuthor.id, { title: 'Rayuela', author: 'Julio Cortázar', quantity: 3 });
  assert.equal(response.status, 409);
  response = await edit(sameTitle.id, { title: 'Rayuela', author: 'Julio Cortázar', quantity: 3 });
  assert.equal(response.status, 409);
  assert.deepEqual(rows(), before);
});

test('PE-11 saving without changing title or author, or changing only case or accents, is not a duplicate', async t => {
  const { register, edit } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 3);
  await register('El principito', 'Antoine de Saint-Exupéry');
  let response = await edit(book.id, { title: 'Rayuela', author: 'Julio Cortázar', quantity: 4 });
  assert.equal(response.status, 200);
  response = await edit(book.id, { title: 'RAYUELA', author: 'julio cortazar', quantity: 4 });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual([data.title, data.author], ['RAYUELA', 'julio cortazar']);
  response = await edit(book.id, { title: 'Rayuelá', author: '  Julio   Cortázar ', quantity: 4 });
  assert.equal(response.status, 200);
});

test('PE-12 a real UNIQUE violation becomes a 409 when the duplicate check does not detect it', async t => {
  const { app, register } = await setup(t);
  await register('Rayuela', 'Julio Cortázar');
  const other = await register('El principito', 'Antoine de Saint-Exupéry');
  const repository = createBooksRepository(app.db);
  const service = createBooksService({ repository: { ...repository, findByNormalizedKey: () => null }, normalizeText });
  assert.throws(
    () => service.editBook(other.id, { title: 'Rayuela', author: 'Julio Cortázar', quantity: 1, categoryId: other.categoryId }),
    error => error.status === 409 && error.code === 'CONFLICT',
  );
  assert.equal(app.db.prepare('SELECT title FROM books WHERE id = ?').get(other.id).title, 'El principito');
});

test('PE-13 PUT on a missing book is a 404 even with an invalid body', async t => {
  const { app, register, edit, rows, valid } = await setup(t);
  const deleted = await register('Eliminado');
  await register('Presente', 'Otra persona');
  app.db.prepare('DELETE FROM books WHERE id = ?').run(deleted.id);
  const before = rows();
  for (const id of [deleted.id, ...INVALID_IDS]) {
    for (const body of [valid(), {}, { title: '', author: '', quantity: -1 }]) {
      const response = await edit(id, body);
      assert.equal(response.status, 404, `id ${id}`);
      assert.deepEqual(await response.json(), BOOK_NOT_FOUND);
    }
  }
  assert.deepEqual(rows(), before);
});

test('PE-14 shelfLabel in the body is rejected with any value and the shelf does not change', async t => {
  const { register, edit, assignShelf, rows, row, valid } = await setup(t);
  const withShelf = await register('Con estante', 'Autor 1');
  const withoutShelf = await register('Sin estante', 'Autor 2');
  assert.equal((await assignShelf(withShelf.id, 'A-1')).status, 200);
  const before = rows();
  for (const id of [withShelf.id, withoutShelf.id]) {
    for (const shelfLabel of ['B-2', '', null, 5]) {
      const response = await edit(id, valid({ shelfLabel }));
      assert.equal(response.status, 400);
      const { error } = await response.json();
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.fields.shelfLabel, SHELF_MESSAGE);
    }
  }
  assert.deepEqual(rows(), before);
  assert.equal(row(withShelf.id).shelf_label, 'A-1');
  assert.equal(row(withoutShelf.id).shelf_label, null);
});

test('PE-15 after editing the title, the search finds the new one and not the old one', async t => {
  const { register, edit, search, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar');
  assert.deepEqual((await search('rayuela')).map(item => item.id), [book.id]);
  const response = await edit(book.id, valid({ title: 'Ficciones', author: 'Jorge Luis Borges' }));
  assert.equal(response.status, 200);
  assert.deepEqual((await search('ficciones')).map(item => item.id), [book.id]);
  assert.deepEqual((await search('FICCIONES')).map(item => item.id), [book.id]);
  assert.deepEqual((await search('borges')).map(item => item.id), [book.id]);
  assert.deepEqual(await search('rayuela'), []);
  assert.deepEqual(await search('cortazar'), []);
});

test('PE-16 sending the values that are already saved succeeds without changing updatedAt', async t => {
  const { app, register, edit } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 4);
  const described = await register('El principito', 'Antoine de Saint-Exupéry', 2, 'Un príncipe pequeño');
  app.db.prepare('UPDATE books SET updated_at = ?').run(OLD_DATE);
  const bodies = [
    [book, { title: 'Rayuela', author: 'Julio Cortázar', quantity: 4 }],
    [book, { title: '  Rayuela ', author: ' Julio Cortázar  ', description: '  ', quantity: 4 }],
    [described, { title: 'El principito', author: 'Antoine de Saint-Exupéry', description: 'Un príncipe pequeño', quantity: 2 }],
  ];
  for (const [target, body] of bodies) {
    const response = await edit(target.id, body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.updatedAt, OLD_DATE);
  }
});

test('PE-17 an edit with changes updates updatedAt and keeps id, createdAt, shelf and other books', async t => {
  const { app, register, edit, assignShelf, rows, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 4);
  const other = await register('El principito', 'Antoine de Saint-Exupéry');
  assert.equal((await assignShelf(book.id, 'A-1')).status, 200);
  app.db.prepare('UPDATE books SET updated_at = ?').run(OLD_DATE);
  const otherBefore = rows().find(row => row.id === other.id);
  const response = await edit(book.id, valid());
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.notEqual(data.updatedAt, OLD_DATE);
  assert.ok(data.updatedAt > OLD_DATE);
  assert.equal(data.id, book.id);
  assert.equal(data.createdAt, book.createdAt);
  assert.equal(data.shelfLabel, 'A-1');
  assert.deepEqual(rows().find(row => row.id === other.id), otherBefore);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 2);
});

test('PE-18 with one valid and one invalid field nothing is saved', async t => {
  const { register, edit, rows, valid } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar', 4, 'Novela');
  const before = rows();
  for (const body of [
    valid({ quantity: -5 }),
    valid({ title: '' }),
    valid({ author: 'A'.repeat(151) }),
    valid({ description: 'D'.repeat(2001) }),
    valid({ title: 'Título válido', quantity: 'abc' }),
  ]) {
    const response = await edit(book.id, body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    assert.deepEqual(rows(), before);
  }
});

test('PE-19 a title with HTML markup is saved and returned as plain text', async t => {
  const { app, register, read, edit } = await setup(t);
  const book = await register('Rayuela', 'Julio Cortázar');
  const body = {
    title: '<script>alert(1)</script>',
    author: "<b>'; DROP TABLE books;--",
    description: '<img src=x onerror=alert(1)>',
    quantity: 1,
  };
  const response = await edit(book.id, body);
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual([data.title, data.author, data.description], [body.title, body.author, body.description]);
  const stored = (await (await read(book.id)).json()).data;
  assert.deepEqual([stored.title, stored.author, stored.description], [body.title, body.author, body.description]);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM books').get().n, 1);
});

test('PE-20 returns 400 for malformed JSON, 403 for another origin and 400 for a non-JSON content type', async t => {
  const { register, edit, rows, valid } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  let response = await edit(book.id, undefined, { rawBody: '{' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  response = await edit(book.id, valid(), { rawBody: JSON.stringify(valid({ description: 'A'.repeat(17000) })) });
  assert.equal(response.status, 400);
  for (const headers of [{ Origin: 'http://other.example' }, { Origin: undefined, Referer: undefined }]) {
    response = await edit(book.id, valid(), { headers });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  }
  response = await edit(book.id, valid(), { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  assert.deepEqual(rows(), before);
  assert.equal((await edit(book.id, valid(), { headers: { Origin: undefined, Referer: 'http://localhost/admin/' } })).status, 200);
});

test('a body that is not a JSON object is rejected with the three required fields', async t => {
  const { register, edit, rows } = await setup(t);
  const book = await register('Rayuela');
  const before = rows();
  for (const rawBody of ['[]', '"texto"', '5', 'null']) {
    const response = await edit(book.id, undefined, { rawBody });
    assert.equal(response.status, 400, rawBody);
    const { error } = await response.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(error.fields).sort(), ['author', 'categoryId', 'quantity', 'title']);
  }
  assert.deepEqual(rows(), before);
});

test('database failures in the edit endpoint use the safe central error response', async t => {
  const { app, register, edit, valid } = await setup(t);
  const book = await register('Rayuela');
  app.db.exec("CREATE TRIGGER reject_edit BEFORE UPDATE ON books BEGIN SELECT RAISE(ABORT, 'private database detail'); END");
  const response = await edit(book.id, valid());
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(body).includes('private database detail'), false);
});
import assert from 'node:assert/strict';
import test from 'node:test';
import { createBooksService } from '../../src/modules/books/books.service.js';
import { createBooksController } from '../../src/modules/books/books.controller.js';
import { registerBooksRoutes } from '../../src/modules/books/books.routes.js';

function normalizeText(value) {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function createMemoryRepository() {
  const books = [];
  return {
    books,
    findByNormalizedKey(titleNormalized, authorNormalized) {
      return books.find((book) => book.titleNormalized === titleNormalized &&
        book.authorNormalized === authorNormalized) ?? null;
    },
    insert(book) {
      const record = {
        ...book,
        id: books.length + 1,
        shelfLabel: null,
        createdAt: '2026-11-18T12:00:00.000Z',
        updatedAt: '2026-11-18T12:00:00.000Z',
      };
      books.push(record);
      const { titleNormalized, authorNormalized, ...publicBook } = record;
      return publicBook;
    },
  };
}

function createService(repository = createMemoryRepository()) {
  return { service: createBooksService({ repository, normalizeText }), repository };
}

const validBook = {
  title: 'Cien años de soledad',
  author: 'Gabriel García Márquez',
  description: 'Novela',
  quantity: 5,
};

function expectError(action, code, field) {
  assert.throws(action, (error) => {
    assert.equal(error.code, code);
    if (field) assert.ok(error.fields?.[field]);
    return true;
  });
}

test('registers a book and trims text without changing internal spaces', () => {
  const { service, repository } = createService();
  const book = service.registerBook({
    title: '  Cien  años de soledad  ',
    author: '  Gabriel García Márquez  ',
    description: '  Novela  ',
    quantity: 1,
  });
  assert.equal(book.title, 'Cien  años de soledad');
  assert.equal(book.author, 'Gabriel García Márquez');
  assert.equal(book.description, 'Novela');
  assert.equal(book.quantity, 1);
  assert.equal(book.shelfLabel, null);
  assert.equal(repository.books[0].titleNormalized, 'cien anos de soledad');
  assert.equal(repository.books[0].authorNormalized, 'gabriel garcia marquez');
  assert.ok(!Object.hasOwn(book, 'titleNormalized'));
  assert.ok(!Object.hasOwn(book, 'authorNormalized'));
});

test('stores absent, null, blank and whitespace-only descriptions as null', () => {
  for (const description of [undefined, null, '', '   ']) {
    const { service } = createService();
    const book = service.registerBook({ ...validBook, description });
    assert.equal(book.description, null);
  }
});

test('reports all missing required fields in one validation error', () => {
  const { service, repository } = createService();
  assert.throws(() => service.registerBook({ title: ' ', author: '', quantity: undefined }), (error) => {
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(error.fields).sort(), ['author', 'quantity', 'title']);
    return true;
  });
  assert.equal(repository.books.length, 0);
});

test('rejects titles or authors that normalize to an empty string', () => {
  const { service } = createService();
  expectError(() => service.registerBook({ ...validBook, title: '\u0301' }), 'VALIDATION_ERROR', 'title');
  expectError(() => service.registerBook({ ...validBook, author: '\u0301' }), 'VALIDATION_ERROR', 'author');
});

test('rejects missing, fractional, out-of-range and nonnumeric quantities', () => {
  for (const quantity of [null, 0, -1, 1.5, '5', 'abc', true, 1000, NaN, Infinity]) {
    const { service } = createService();
    expectError(() => service.registerBook({ ...validBook, quantity }), 'VALIDATION_ERROR', 'quantity');
  }
});

test('accepts quantity boundaries 1 and 999', () => {
  for (const quantity of [1, 999]) {
    const { service } = createService();
    assert.equal(service.registerBook({ ...validBook, quantity }).quantity, quantity);
  }
});

test('validates text lengths at defined boundaries', () => {
  const { service } = createService();
  assert.equal(service.registerBook({ ...validBook, title: 'A'.repeat(200), author: 'B'.repeat(150), description: 'C'.repeat(2000) }).title.length, 200);
  expectError(() => service.registerBook({ ...validBook, title: 'A'.repeat(201) }), 'VALIDATION_ERROR', 'title');
  expectError(() => service.registerBook({ ...validBook, author: 'B'.repeat(151) }), 'VALIDATION_ERROR', 'author');
  expectError(() => service.registerBook({ ...validBook, description: 'C'.repeat(2001) }), 'VALIDATION_ERROR', 'description');
});

test('rejects nonstring fields without inserting anything', () => {
  const { service, repository } = createService();
  expectError(() => service.registerBook({ ...validBook, title: 123 }), 'VALIDATION_ERROR', 'title');
  expectError(() => service.registerBook({ ...validBook, author: {} }), 'VALIDATION_ERROR', 'author');
  expectError(() => service.registerBook({ ...validBook, description: 1 }), 'VALIDATION_ERROR', 'description');
  assert.equal(repository.books.length, 0);
});

test('detects duplicates regardless of case, accents and repeated spaces', () => {
  const { service, repository } = createService();
  service.registerBook(validBook);
  expectError(() => service.registerBook({
    ...validBook,
    title: ' CIEN  ANOS   DE SOLEDAD ',
    author: ' GABRIEL GARCIA MARQUEZ ',
  }), 'CONFLICT');
  assert.equal(repository.books.length, 1);
});

test('allows the same title with a different author and vice versa', () => {
  const { service, repository } = createService();
  service.registerBook(validBook);
  service.registerBook({ ...validBook, author: 'Otro autor' });
  service.registerBook({ ...validBook, title: 'Otro título' });
  assert.equal(repository.books.length, 3);
});

test('translates a unique constraint violation into a conflict', () => {
  const repository = {
    findByNormalizedKey: () => null,
    insert: () => { const error = new Error('UNIQUE constraint failed'); error.code = 'SQLITE_CONSTRAINT_UNIQUE'; throw error; },
  };
  const { service } = createService(repository);
  expectError(() => service.registerBook(validBook), 'CONFLICT');
});

test('does not disguise unrelated database errors as conflicts', () => {
  const error = new Error('Database is unavailable');
  error.code = 'SQLITE_BUSY';
  const repository = { findByNormalizedKey: () => null, insert: () => { throw error; } };
  const { service } = createService(repository);
  assert.throws(() => service.registerBook(validBook), (actual) => actual === error);
});

test('controller returns a 201 response and forwards service errors', async () => {
  const { service } = createService();
  const controller = createBooksController({ service });
  const response = {
    statusCode: null,
    data: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.data = value; return this; },
  };
  let nextError;
  await controller.register({ body: validBook }, response, (error) => { nextError = error; });
  assert.equal(response.statusCode, 201);
  assert.equal(response.data.data.title, validBook.title);
  assert.equal(nextError, undefined);
  await controller.register({ body: validBook }, response, (error) => { nextError = error; });
  assert.equal(nextError.code, 'CONFLICT');
});

test('route registers the admin guard before the controller', () => {
  const handlers = [];
  const router = { post(path, ...middleware) { assert.equal(path, '/'); handlers.push(...middleware); } };
  const requireAdmin = (_req, _res, next) => next();
  const register = () => {};
  registerBooksRoutes(router, { requireAdmin, controller: { register } });
  assert.deepEqual(handlers, [requireAdmin, register]);
  assert.throws(() => registerBooksRoutes(router, { controller: { register } }), TypeError);
});

test('preserves HTML-like text without applying markup transformations', () => {
  const { service } = createService();
  const title = '<script>alert(1)</script>';
  assert.equal(service.registerBook({ ...validBook, title }).title, title);
});

test('ignores unexpected input properties and does not write them', () => {
  const { service, repository } = createService();
  const book = service.registerBook({ ...validBook, id: 1000, shelfLabel: 'A-1', isAdmin: true });
  assert.equal(book.id, 1);
  assert.equal(book.shelfLabel, null);
  assert.equal(repository.books[0].isAdmin, undefined);
});

test('counts supplementary Unicode characters as characters rather than UTF-16 units', () => {
  const { service } = createService();
  const title = '📚'.repeat(200);
  assert.equal(service.registerBook({ ...validBook, title }).title, title);
  expectError(() => service.registerBook({ ...validBook, title: `${title}📚` }), 'VALIDATION_ERROR', 'title');
});

test('rejects invalid dependencies instead of silently bypassing protections', () => {
  assert.throws(() => createBooksService({ normalizeText }), TypeError);
  assert.throws(() => createBooksController({}), TypeError);
  assert.throws(() => registerBooksRoutes({ post() {} }, { requireAdmin: () => {} }), TypeError);
});

test('rejects requests without permission before invoking the controller handler', () => {
  let invoked = false;
  let middleware;
  const router = { post(_path, ...handlers) { middleware = handlers; } };
  const error = Object.assign(new Error('Debe iniciar sesión.'), { code: 'UNAUTHENTICATED' });
  const requireAdmin = (_request, _response, next) => next(error);
  const controller = { register() { invoked = true; } };
  registerBooksRoutes(router, { requireAdmin, controller });
  let actualError;
  middleware[0]({}, {}, (receivedError) => { actualError = receivedError; });
  assert.equal(actualError, error);
  assert.equal(invoked, false);
});

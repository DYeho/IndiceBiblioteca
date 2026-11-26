import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { normalizeText } from '../../src/utils/normalize-text.js';
import { createTestApp } from '../test-app.js';

describe('Búsqueda pública de libros GET /api/books (HU-006)', () => {
  let app;

  before(async () => {
    app = await createTestApp();
    const categoryId = app.db.prepare('SELECT id FROM categories WHERE normalized_name = ?').get('literatura').id;
    const insert = app.db.prepare(`
      INSERT INTO books (title, author, quantity, category_id, shelf_label, title_normalized, author_normalized)
      VALUES (@title, @author, @quantity, @categoryId, @shelfLabel, @titleNormalized, @authorNormalized)
    `);

    const fixtures = [
      { title: 'Cien años de soledad', author: 'Gabriel García Márquez', quantity: 3, shelfLabel: 'A-3' },
      { title: 'El amor en los tiempos del cólera', author: 'Gabriel García Márquez', quantity: 0, shelfLabel: 'A-4' },
      { title: 'Don Quijote de la Mancha', author: 'Miguel de Cervantes', quantity: 2, shelfLabel: null },
      { title: 'Rayuela', author: 'Zulema Autor', quantity: 1, shelfLabel: 'C-1' },
      { title: 'Rayuela', author: 'Abelardo Autor', quantity: 4, shelfLabel: 'C-2' },
    ];

    for (const book of fixtures) {
      insert.run({
        ...book,
        categoryId,
        titleNormalized: normalizeText(book.title),
        authorNormalized: normalizeText(book.author),
      });
    }
  });

  after(async () => {
    await app.close();
  });

  it('valida parámetro q ausente, vacío, solo diacríticos, repetido o > 200 caracteres', async () => {
    const invalidUrls = [
      '/api/books',
      '/api/books?q=%20%20',
      '/api/books?q=%CC%81',
      '/api/books?q=a&q=b',
      `/api/books?q=${'a'.repeat(201)}`,
    ];

    for (const url of invalidUrls) {
      const res = await app.request(url, { method: 'GET' });
      const json = await res.json();
      assert.equal(res.status, 400, `Se esperaba 400 para ${url}`);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
      assert.ok(json.error.fields.q);
    }
  });

  it('busca sin distinguir mayúsculas ni tildes y expone solo los campos públicos', async () => {
    const res = await app.request('/api/books?q=GARC%C3%8DA', { method: 'GET' });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 2);
    assert.equal(json.data.length, 2);

    const first = json.data[0];
    assert.deepEqual(Object.keys(first).sort(), ['author', 'category', 'id', 'quantity', 'shelfLabel', 'title']);
    assert.equal(first.title, 'Cien años de soledad');
    assert.equal(first.category, 'Literatura');
    assert.equal(first.quantity, 3);
    assert.equal(first.shelfLabel, 'A-3');
    assert.equal(json.data[1].quantity, 0);
  });

  it('ordena determinísticamente por título normalizado, autor normalizado e id', async () => {
    const res = await app.request('/api/books?q=rayuela', { method: 'GET' });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 2);
    assert.equal(json.data[0].author, 'Abelardo Autor');
    assert.equal(json.data[1].author, 'Zulema Autor');
  });

  it('trata % y _ como caracteres literales y devuelve lista vacía sin coincidencias', async () => {
    const wildcardRes = await app.request('/api/books?q=%25', { method: 'GET' });
    assert.equal(wildcardRes.status, 200);
    assert.deepEqual(await wildcardRes.json(), { data: [], meta: { total: 0 } });

    const underscoreRes = await app.request('/api/books?q=_', { method: 'GET' });
    assert.equal(underscoreRes.status, 200);
    assert.deepEqual(await underscoreRes.json(), { data: [], meta: { total: 0 } });
  });
});
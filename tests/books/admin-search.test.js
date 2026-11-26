import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestApp } from '../test-app.js';

test('admin category browsing is protected and paginates filtered results', async t => {
  const app = await createTestApp();
  t.after(() => app.close());

  const literatureId = app.db.prepare('SELECT id FROM categories WHERE normalized_name = ?').get('literatura').id;
  const mathId = app.db.prepare('SELECT id FROM categories WHERE normalized_name = ?').get('matematicas').id;
  const anonymous = await app.request(`/api/admin/books?categoryId=${literatureId}`, { method: 'GET' });
  assert.equal(anonymous.status, 401);

  const { cookie } = await app.login();
  for (let index = 1; index <= 25; index += 1) {
    const response = await app.request('/api/books', {
      body: {
        title: `Libro ${String(index).padStart(2, '0')}`,
        author: `Autor ${index}`,
        quantity: 1,
        categoryId: index % 2 === 0 ? literatureId : mathId,
      },
      cookie,
    });
    assert.equal(response.status, 201);
  }

  const firstPage = await app.request(`/api/admin/books?categoryId=${literatureId}&page=1`, { method: 'GET', cookie });
  assert.equal(firstPage.status, 200);
  const first = await firstPage.json();
  assert.deepEqual(first.meta, { total: 12, page: 1, pageSize: 10, totalPages: 2 });
  assert.equal(first.data.length, 10);
  assert.ok(first.data.every(book => book.category === 'Literatura'));

  const secondPage = await app.request(`/api/admin/books?categoryId=${literatureId}&page=2`, { method: 'GET', cookie });
  const second = await secondPage.json();
  assert.deepEqual(second.meta, { total: 12, page: 2, pageSize: 10, totalPages: 2 });
  assert.equal(second.data.length, 2);

  const textFilter = await app.request(`/api/admin/books?q=libro%2024&categoryId=${literatureId}`, { method: 'GET', cookie });
  assert.equal((await textFilter.json()).data[0].title, 'Libro 24');

  const lastPage = await app.request(`/api/admin/books?page=999`, { method: 'GET', cookie });
  const last = await lastPage.json();
  assert.equal(last.meta.page, last.meta.totalPages);
  assert.equal(last.data.length, 5);

  for (const query of ['page=0', 'page=1&page=2', 'categoryId=999999', 'q=a&q=b']) {
    const invalid = await app.request(`/api/admin/books?${query}`, { method: 'GET', cookie });
    assert.equal(invalid.status, 400, query);
    assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
  }

  const publicBrowse = await app.request('/api/books', { method: 'GET' });
  assert.equal(publicBrowse.status, 400);
});

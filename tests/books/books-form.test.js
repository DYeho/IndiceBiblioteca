import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBookForm } from '../../public/js/admin/books.js';
import { createTestApp } from '../test-app.js';

const values = { title: ' Cien  años de soledad ', author: ' Gabriel García Márquez ', description: ' Novela ', quantity: '5' };

test('registration form produces trimmed text and an integer JSON quantity', () => {
  const { body, fields } = validateBookForm(values);
  assert.deepEqual(fields, {});
  assert.deepEqual(body, { title: 'Cien  años de soledad', author: 'Gabriel García Márquez', description: 'Novela', quantity: 5 });
  assert.equal(JSON.parse(JSON.stringify(body)).quantity, 5);
});

test('registration form reports required fields and text that normalizes to empty', () => {
  assert.deepEqual(validateBookForm({ title: ' ', author: '', description: '', quantity: ' ' }).fields, {
    title: 'El título es obligatorio.',
    author: 'El autor es obligatorio.',
    quantity: 'La cantidad inicial es obligatoria.',
  });
  for (const name of ['title', 'author']) {
    assert.ok(validateBookForm({ ...values, [name]: '\u0301' }).fields[name]);
  }
});

test('registration form enforces text limits without truncation', () => {
  const accepted = validateBookForm({ ...values, title: '📚'.repeat(200), author: 'B'.repeat(150), description: 'C'.repeat(2000) });
  assert.deepEqual(accepted.fields, {});
  for (const [name, length] of [['title', 201], ['author', 151], ['description', 2001]]) {
    assert.ok(validateBookForm({ ...values, [name]: 'A'.repeat(length) }).fields[name]);
  }
  assert.equal(validateBookForm({ ...values, title: '\u0301'.repeat(201) }).fields.title, 'El título no puede superar 200 caracteres.');
});

test('registration form rejects invalid numeric text and accepts the integer boundaries', () => {
  for (const quantity of ['0', '-3', '2.5', 'abc', '1000', '1e2', '+1', '0x10', '1,5']) {
    assert.equal(validateBookForm({ ...values, quantity }).fields.quantity, 'La cantidad inicial debe ser un número entero entre 1 y 999.');
  }
  for (const quantity of ['1', '999']) {
    const result = validateBookForm({ ...values, quantity });
    assert.deepEqual(result.fields, {});
    assert.equal(result.body.quantity, Number(quantity));
  }
});

test('registration form accepts an optional description and preserves literal markup text', () => {
  const result = validateBookForm({ ...values, title: '<script>alert(1)</script>', description: ' ' });
  assert.deepEqual(result.fields, {});
  assert.equal(result.body.description, '');
  assert.equal(result.body.title, '<script>alert(1)</script>');
});

test('registration form payload registers through real authentication and SQLite', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  const { cookie } = await app.login();
  const payload = validateBookForm({ ...values, description: '' });
  assert.deepEqual(payload.fields, {});
  const response = await app.request('/api/books', { body: payload.body, cookie });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.title, payload.body.title);
  assert.equal(data.quantity, 5);
  assert.equal(data.description, null);
  assert.equal(app.db.prepare('SELECT quantity FROM books WHERE id = ?').get(data.id).quantity, 5);
  const duplicate = validateBookForm({ ...values, title: 'CIEN ANOS DE SOLEDAD', author: 'GABRIEL GARCIA MARQUEZ' });
  assert.equal((await app.request('/api/books', { body: duplicate.body, cookie })).status, 409);
});

test('the authenticated registration page and its modules are served under the existing CSP', async t => {
  const app = await createTestApp();
  t.after(() => app.close());
  const { cookie } = await app.login();
  const response = await app.request('/admin/', { method: 'GET', cookie });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  const html = await response.text();
  assert.match(html, /<form id="book-form" novalidate>/);
  assert.match(html, /<textarea[^>]+name="description"[^>]+maxlength="2000"/);
  assert.match(html, /<input[^>]+name="quantity"[^>]+type="text"[^>]+inputmode="numeric"/);
  assert.doesNotMatch(html, /\s(?:style|on[a-z]+)\s*=|<style\b/i);
  for (const path of ['/js/admin/main.js', '/js/admin/books.js', '/js/shared/api.js', '/js/shared/utils.js']) {
    const asset = await app.request(path, { method: 'GET', cookie });
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.ok((await asset.text()).length > 0);
  }
});

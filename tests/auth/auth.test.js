import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createAuthRepository } from '../../src/modules/auth/auth.repository.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { startTestApp } from '../helpers/test-app.js';

describe('Autenticación y protección de Administración (HU-001)', () => {
  let ctx;

  before(async () => {
    ctx = await startTestApp();
    const authService = createAuthService({
      authRepository: createAuthRepository(ctx.db),
      bcryptCost: ctx.config.bcryptCost,
    });
    await authService.createAccount({ username: 'Admin1', password: 'Password123' });
  });

  after(async () => {
    await ctx.close();
  });

  it('redirige /admin/ a /login.html cuando no hay sesión', async () => {
    const res = await ctx.request('/admin/');
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/login.html');
  });

  it('rechaza POST sin Origin válido (403) o sin Content-Type JSON (400)', async () => {
    const badOrigin = await ctx.request('/api/auth/login', {
      method: 'POST',
      origin: 'http://evil.example',
      body: { username: 'admin1', password: 'Password123' },
    });
    assert.equal(badOrigin.status, 403);
    assert.equal(badOrigin.json.error.code, 'FORBIDDEN');

    const badContentType = await ctx.request('/api/auth/login', {
      method: 'POST',
      contentType: 'text/plain',
      body: 'username=admin1',
    });
    assert.equal(badContentType.status, 400);
    assert.equal(badContentType.json.error.code, 'VALIDATION_ERROR');
  });

  it('valida campos vacíos en login con 400 sin consumir intentos fallidos', async () => {
    const res = await ctx.request('/api/auth/login', {
      method: 'POST',
      body: { username: '   ', password: '' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, 'VALIDATION_ERROR');
    assert.ok(res.json.error.fields.username);
    assert.ok(res.json.error.fields.password);
  });

  it('inicia sesión, permite entrar a /admin/ con cookie ib.sid y cierra sesión correctamente', async () => {
    const loginRes = await ctx.request('/api/auth/login', {
      method: 'POST',
      body: { username: '  ADMIN1 ', password: 'Password123' },
    });
    assert.equal(loginRes.status, 200);
    assert.deepEqual(loginRes.json, { data: { username: 'admin1' } });

    const sidHeader = loginRes.setCookies.find((c) => c.startsWith('ib.sid='));
    assert.ok(sidHeader, 'Debe emitir la cookie ib.sid');
    assert.match(sidHeader, /HttpOnly/i);
    assert.match(sidHeader, /SameSite=Lax/i);

    const sessionCookie = sidHeader.split(';')[0];

    const adminRes = await ctx.request('/admin/', { cookie: sessionCookie });
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.headers.get('cache-control'), 'no-store');

    const logoutRes = await ctx.request('/api/auth/logout', {
      method: 'POST',
      cookie: sessionCookie,
    });
    assert.equal(logoutRes.status, 204);

    const adminAfterLogout = await ctx.request('/admin/', { cookie: sessionCookie });
    assert.equal(adminAfterLogout.status, 302);
    assert.equal(adminAfterLogout.headers.get('location'), '/login.html');
  });

  it('bloquea tras 5 intentos fallidos de login (429 RATE_LIMITED)', async () => {
    for (let i = 0; i < 5; i += 1) {
      const failRes = await ctx.request('/api/auth/login', {
        method: 'POST',
        body: { username: 'admin1', password: 'wrong-password' },
      });
      assert.equal(failRes.status, 401);
      assert.equal(failRes.json.error.code, 'INVALID_CREDENTIALS');
    }

    const blockedRes = await ctx.request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin1', password: 'Password123' },
    });
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedRes.json.error.code, 'RATE_LIMITED');
  });
});
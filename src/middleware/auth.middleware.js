import { unauthenticated } from '../utils/errors.js';

function hasValidSession(req, authRepository) {
  const adminId = req.session?.adminId;
  return Number.isInteger(adminId) && authRepository.findById(adminId) !== undefined;
}

/**
 * Exige sesión válida en la API. Además de que la sesión exista, comprueba que
 * la cuenta siga existiendo en la base de datos (SPEC-001 §8.1).
 */
export function createRequireAdmin(authRepository) {
  return function requireAdmin(req, res, next) {
    if (!hasValidSession(req, authRepository)) {
      return next(unauthenticated());
    }
    return next();
  };
}

/**
 * Guardia de /admin (SPEC-001 §6.4). Va ANTES de los archivos estáticos.
 * Sin sesión válida: 302 a /login.html. Con sesión: Cache-Control: no-store.
 * Express no distingue mayúsculas en las rutas, así que /ADMIN/ también pasa por aquí.
 */
export function createAdminGuard(authRepository) {
  return function adminGuard(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    if (!hasValidSession(req, authRepository)) {
      return res.redirect(302, '/login.html');
    }
    res.set('Cache-Control', 'no-store');
    return next();
  };
}
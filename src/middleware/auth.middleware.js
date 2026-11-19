import { posix } from 'node:path';
import { unauthenticated } from '../utils/errors.js';

// Session field that stores the logged-in administrator id. Written at login, read here.
export const SESSION_ADMIN_KEY = 'adminId';

/**
 * Admin only access control (SPEC-001 §6.4, §8.1).
 * A session is valid when it holds an administrator id AND that account still exists in the database.
 */
export function createAuthMiddleware({ authRepository }) {
  function hasValidSession(req) {
    const adminId = req.session?.[SESSION_ADMIN_KEY];
    return Number.isInteger(adminId) && authRepository.findById(adminId) !== null;
  }

  // The path is normalized (decoded, slashes collapsed, lowercase) so no spelling reaches /admin unchecked.
  function isAdminPath(rawPath) {
    let decoded;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {
      return true; // malformed path: protect it
    }
    const normalized = posix.normalize(decoded.replaceAll('\\', '/')).toLowerCase();
    return normalized === '/admin' || normalized.startsWith('/admin/');
  }

  return {
    /** API: 401 UNAUTHENTICATED without a valid session. */
    requireAdmin(req, res, next) {
      return hasValidSession(req) ? next() : next(unauthenticated());
    },

    /** Pages: GET/HEAD under /admin without a valid session redirect to /login.html. Runs before static files. */
    adminPageGuard(req, res, next) {
      if (!isAdminPath(req.path)) return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (!hasValidSession(req)) return res.redirect(302, '/login.html');
      res.set('Cache-Control', 'no-store');
      return next();
    },
  };
}
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // SPEC-001 RN-007: 5 failed attempts per IP every 15 minutes
const LOGIN_MAX_FAILED_ATTEMPTS = 5;

/**
 * Login rate limiter (D-08): only 401 responses count as failed attempts.
 * 200 and 400 do not count. Once the limit is exceeded it answers 429 even with correct credentials,
 * until the window ends. Limits are parameters so they can be adjusted without touching the logic.
 */
export function createLoginLimiter({ windowMs = LOGIN_WINDOW_MS, limit = LOGIN_MAX_FAILED_ATTEMPTS } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,
    handler: (req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Inténtelo de nuevo más tarde.' },
      }),
  });
}

/**
 * Authentication routes. Mounted by app.js under /api/auth.
 * Behind a reverse proxy, app.js must set `trust proxy` (TRUST_PROXY) so the limiter sees the real IP.
 */
export function createAuthRouter({ authController, requireAdmin, loginLimiter = createLoginLimiter() }) {
  const router = Router();
  router.post('/login', loginLimiter, authController.login);
  router.post('/logout', requireAdmin, authController.logout);
  return router;
}
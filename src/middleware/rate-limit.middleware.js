import { rateLimit } from 'express-rate-limit';

/**
 * General limiter for /api: 100 requests per IP per minute (SPEC-000 §4.8).
 * The login limiter lives with its route, in auth.routes.js.
 */
export function createApiLimiter({ windowMs = 60 * 1000, limit = 100 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Inténtelo de nuevo más tarde.' },
      }),
  });
}
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/errors.js';

function handler(message) {
  return (req, res, next) => next(new AppError(429, 'RATE_LIMITED', message));
}

/**
 * Login: 5 intentos FALLIDOS por IP cada 15 minutos (D-08).
 * Solo cuentan las respuestas 401; los 200 y los 400 no cuentan.
 */
export function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,
    handler: handler('Demasiados intentos. Inténtelo de nuevo más tarde.'),
  });
}

/** General de /api: 100 solicitudes por IP por minuto (SPEC-001 §8.3). */
export function createApiLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: handler('Demasiadas solicitudes. Inténtelo de nuevo más tarde.'),
  });
}
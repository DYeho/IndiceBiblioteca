import { AppError } from '../utils/errors.js';

const MODIFYING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originFromReferer(referer) {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Protección CSRF (SPEC-001 §8.2): en métodos que modifican, compara Origin
 * (o Referer si falta) con ALLOWED_ORIGIN y exige Content-Type: application/json.
 * `config.allowedOrigin` se lee en cada solicitud porque las pruebas lo fijan
 * después de abrir el puerto efímero.
 */
export function verifyOriginAndContentType(config) {
  return function originMiddleware(req, res, next) {
    if (!MODIFYING_METHODS.has(req.method)) {
      return next();
    }

    const origin = req.get('origin') ?? (req.get('referer') ? originFromReferer(req.get('referer')) : null);
    if (!origin || origin !== config.allowedOrigin) {
      return next(new AppError(403, 'FORBIDDEN', 'Solicitud no permitida desde este origen.'));
    }

    if (!req.is('application/json')) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'La solicitud debe enviarse como application/json.'),
      );
    }
    return next();
  };
}
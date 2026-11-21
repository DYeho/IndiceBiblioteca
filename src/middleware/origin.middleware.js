import { forbidden, validationError } from '../utils/errors.js';

const MODIFYING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const JSON_CONTENT_TYPE = /^application\/json\s*(;|$)/i;

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF protection and content type check (SPEC-000 §4.8, SPEC-001 §8.2).
 * In POST, PUT, PATCH and DELETE: Origin (or Referer when Origin is missing) must match the allowed
 * origin, otherwise 403 FORBIDDEN; the Content-Type must be application/json, otherwise 400.
 */
export function verifyOriginAndContentType({ allowedOrigin }) {
  const allowed = originOf(allowedOrigin) ?? allowedOrigin;

  return (req, res, next) => {
    if (!MODIFYING_METHODS.has(req.method)) return next();

    const source = req.get('Origin') ?? req.get('Referer');
    const sourceOrigin = source ? originOf(source) : null;
    if (!sourceOrigin || sourceOrigin !== allowed) {
      return next(forbidden('Origen de la solicitud no permitido.'));
    }

    if (!JSON_CONTENT_TYPE.test(req.get('Content-Type') ?? '')) {
      return next(validationError('La solicitud debe enviarse como application/json.'));
    }
    return next();
  };
}
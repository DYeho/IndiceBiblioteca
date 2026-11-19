import { AppError, notFound } from '../utils/errors.js';

/** JSON 404 for any /api route that did not match (SPEC-001 §6.6, step 6). */
export function notFoundApi(req, res, next) {
  next(notFound());
}

/**
 * Final error handler (SPEC-000 §4.7). Never sends traces, paths or database messages.
 */
export function createErrorHandler({ logErrors = true } = {}) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof AppError) {
      const body = { code: error.code, message: error.message };
      if (error.fields) body.fields = error.fields;
      return res.status(error.status).json({ error: body });
    }

    // Malformed JSON, body over the 16 kB limit or any other client error from body-parser.
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es un JSON válido.' } });
    }
    if (error.type === 'entity.too.large') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud es demasiado grande.' } });
    }
    if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500 && error.expose) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'La solicitud no es válida.' } });
    }

    if (logErrors) console.error('Unhandled error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno. Inténtelo de nuevo más tarde.' } });
  };
}
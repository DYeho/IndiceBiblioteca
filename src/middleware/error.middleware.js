import { AppError } from '../utils/errors.js';

/** 404 en formato JSON para cualquier ruta de /api no definida. */
export function apiNotFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Recurso no encontrado.'));
}

function body(code, message, fields) {
  const error = { code, message };
  if (fields) {
    error.fields = fields;
  }
  return { error };
}

/** Manejo centralizado de errores (SPEC-000 §4.4 y SPEC-001 §6.6). Debe registrarse al final. */
export function createErrorHandler({ silent = false } = {}) {
  // Express reconoce un manejador de errores por sus 4 parámetros: no quitar `next`.
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof AppError) {
      return res.status(error.status).json(body(error.code, error.message, error.fields));
    }

    // JSON mal formado o cuerpo mayor de 16 kB (errores de express.json).
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      return res
        .status(400)
        .json(body('VALIDATION_ERROR', 'El cuerpo de la solicitud no es válido o es demasiado grande.'));
    }

    if (!silent) {
      // Solo en el registro del servidor. Nunca se envía al cliente ni se registran cuerpos de solicitudes.
      console.error('[error]', error?.stack ?? error);
    }
    return res.status(500).json(body('INTERNAL_ERROR', 'Ocurrió un error interno. Inténtelo de nuevo más tarde.'));
  };
}
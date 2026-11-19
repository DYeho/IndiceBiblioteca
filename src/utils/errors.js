/**
 * Application error with the HTTP status and the stable `code` of SPEC-000 §4.7.
 * `error.middleware.js` turns it into the JSON error response.
 */
export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}

export const validationError = (message, fields) => new AppError(400, 'VALIDATION_ERROR', message, fields);
export const unauthenticated = (message = 'Se requiere iniciar sesión.') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'Solicitud no permitida.') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Recurso no encontrado.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
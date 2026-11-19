/** Error controlado de la aplicación: lo traduce error.middleware.js a la respuesta de SPEC-000 §4.7. */
export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const validationError = (fields, message = 'Los datos enviados no son válidos.') =>
  new AppError(400, 'VALIDATION_ERROR', message, fields);

export const unauthenticated = (message = 'Debe iniciar sesión.') =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'Solicitud no permitida.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Recurso no encontrado.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message) => new AppError(409, 'CONFLICT', message);

export const rateLimited = (message = 'Demasiadas solicitudes. Inténtelo de nuevo más tarde.') =>
  new AppError(429, 'RATE_LIMITED', message);
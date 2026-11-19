// Único punto de comunicación con el backend (SPEC-000 §9.5).
// Los módulos de cada área no llaman a fetch directamente.

let redirectOnUnauthorized = false;

/** Solo el área de Administración lo activa: un 401 lleva a /login.html. */
export function enableUnauthorizedRedirect() {
  redirectOnUnauthorized = true;
}

export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message = '', fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * Hace una petición a la API y devuelve el cuerpo de éxito ({ data, meta }),
 * o null en respuestas 204. Ante un error lanza ApiError con code, message y fields.
 */
export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  const queryString = query ? `?${new URLSearchParams(query)}` : '';
  const init = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (method !== 'GET' && method !== 'HEAD') {
    // El servidor exige Content-Type JSON en toda modificación, incluso sin datos.
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body ?? {});
  }

  let response;
  try {
    response = await fetch(`${path}${queryString}`, init);
  } catch {
    throw new ApiError({ code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.' });
  }

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // La respuesta no era JSON: se trata como error genérico más abajo.
  }

  if (!response.ok) {
    if (response.status === 401 && redirectOnUnauthorized) {
      window.location.assign('/login.html');
    }
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'UNKNOWN_ERROR',
      message: payload?.error?.message ?? 'Ocurrió un error inesperado.',
      fields: payload?.error?.fields,
    });
  }

  return payload;
}
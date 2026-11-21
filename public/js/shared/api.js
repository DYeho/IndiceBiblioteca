/**
 * The only module that talks to the backend (SPEC-000 §9.5).
 * Sends and receives JSON with the session cookie, understands the response format of §4.7 and,
 * on a 401 inside the administration area, redirects to /login.html. login.html does not redirect.
 */

export class ApiError extends Error {
  constructor({ status, code, message, fields = {} }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function isAdminArea() {
  return window.location.pathname.toLowerCase().startsWith('/admin');
}

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Inténtelo de nuevo.',
    });
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.error ?? {};
    if (response.status === 401 && isAdminArea()) window.location.assign('/login.html');
    throw new ApiError({
      status: response.status,
      code: detail.code ?? 'UNKNOWN_ERROR',
      message: detail.message ?? 'Ocurrió un error inesperado.',
      fields: detail.fields ?? {},
    });
  }

  return payload?.data ?? null;
}
import { promisify } from 'node:util';
import { SESSION_ADMIN_KEY } from '../../middleware/auth.middleware.js';

const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
};

function sendError(res, status, error) {
  const body = { code: error.code, message: error.message };
  if (error.fields) body.fields = error.fields;
  return res.status(status).json({ error: body });
}

export function createAuthController({ authService, clearSessionCookie }) {
  return {
    /**
     * POST /api/auth/login (SPEC-001 §6.1).
     * 200 { data: { username } } and a new session | 400 VALIDATION_ERROR | 401 INVALID_CREDENTIALS.
     * Any other error goes to the error middleware.
     */
    async login(req, res, next) {
      const { username, password } = req.body ?? {};

      let account;
      try {
        account = await authService.login({ username, password });
      } catch (error) {
        const status = STATUS_BY_CODE[error.code];
        if (status) return sendError(res, status, error);
        return next(error);
      }

      try {
        // New session identifier on every login, so a pre-login id is never reused (RN-A04).
        await promisify(req.session.regenerate.bind(req.session))();
        req.session[SESSION_ADMIN_KEY] = account.id;
        await promisify(req.session.save.bind(req.session))();
      } catch (error) {
        return next(error);
      }

      return res.status(200).json({ data: { username: account.username } });
    },

    /**
     * POST /api/auth/logout (SPEC-001 §6.5). The route already ran requireAdmin, so a valid session exists.
     * Destroys the session on the server and clears the ib.sid cookie. 204 without body.
     */
    async logout(req, res, next) {
      try {
        await promisify(req.session.destroy.bind(req.session))();
      } catch (error) {
        return next(error);
      }
      clearSessionCookie(res);
      return res.status(204).end();
    },
  };
}
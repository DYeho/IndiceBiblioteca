import { promisify } from 'node:util';
import { SESSION_COOKIE_NAME } from '../../middleware/session.middleware.js';

export function createAuthController({ authService, cookieSecure }) {
  return {
    async login(req, res) {
      const admin = await authService.login(req.body ?? {});

      // Sesión nueva: se regenera el identificador (SPEC-001 §8.1).
      await promisify(req.session.regenerate.bind(req.session))();
      req.session.adminId = admin.id;
      await promisify(req.session.save.bind(req.session))();

      res.json({ data: { username: admin.username } });
    },

    logout(req, res, next) {
      req.session.destroy((error) => {
        if (error) {
          return next(error);
        }
        res.clearCookie(SESSION_COOKIE_NAME, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: cookieSecure,
        });
        return res.status(204).end();
      });
    },
  };
}
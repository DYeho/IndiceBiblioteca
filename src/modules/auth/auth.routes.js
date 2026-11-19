import { Router } from 'express';

export function createAuthRouter({ authController, loginLimiter, requireAdmin }) {
  const router = Router();
  router.post('/login', loginLimiter, authController.login);
  router.post('/logout', requireAdmin, authController.logout);
  return router;
}
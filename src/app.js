import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { ROOT_DIR } from './config/env.js';
import { apiNotFound, createErrorHandler } from './middleware/error.middleware.js';
import { createAdminGuard, createRequireAdmin } from './middleware/auth.middleware.js';
import { verifyOriginAndContentType } from './middleware/origin.middleware.js';
import { createApiLimiter, createLoginLimiter } from './middleware/rate-limit.middleware.js';
import { createSessionMiddleware } from './middleware/session.middleware.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createBooksController } from './modules/books/books.controller.js';
import { createBooksRepository } from './modules/books/books.repository.js';
import { createBooksRouter } from './modules/books/books.routes.js';
import { createBooksService } from './modules/books/books.service.js';

const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

/**
 * Fábrica de la aplicación (SPEC-001 §9). Recibe la configuración y la conexión
 * a la base de datos para poder construirla también desde las pruebas.
 */
export function createApp({ config, db }) {
  const app = express();

  // 1. Confianza en el proxy (TRUST_PROXY=1 detrás de Nginx).
  app.set('trust proxy', config.trustProxy ? 1 : false);

  // 2. Helmet con CSP: origen propio, sin inline, sin marcos.
  app.use(
    helmet({
      strictTransportSecurity: config.isProduction, // HSTS solo en producción (HTTPS)
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
    }),
  );

  // 3. Sesión.
  const { middleware: sessionMiddleware, store: sessionStore } = createSessionMiddleware(config);
  app.use(sessionMiddleware);
  app.locals.sessionStore = sessionStore;

  // Composición de módulos (routes → controller → service → repository).
  const authRepository = createAuthRepository(db);
  const authService = createAuthService({ authRepository, bcryptCost: config.bcryptCost });
  const requireAdmin = createRequireAdmin(authRepository);
  const authRouter = createAuthRouter({
    authController: createAuthController({ authService, cookieSecure: config.isProduction }),
    loginLimiter: createLoginLimiter(),
    requireAdmin,
  });

  const booksRepository = createBooksRepository(db);
  const booksService = createBooksService({ booksRepository });
  const booksRouter = createBooksRouter({
    booksController: createBooksController({ booksService }),
  });

  // 4 a 6. API.
  const api = express.Router();
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(express.json({ limit: '16kb' }));
  api.use(verifyOriginAndContentType(config));
  api.use(createApiLimiter());
  api.use('/auth', authRouter);
  api.use('/books', booksRouter);
  api.use(apiNotFound);
  app.use('/api', api);

  // 7. Guardia de /admin, ANTES de los estáticos.
  app.use('/admin', createAdminGuard(authRepository));

  // 8. Estáticos: solo public/.
  app.use(express.static(PUBLIC_DIR));

  // 9. Errores.
  app.use(createErrorHandler({ silent: config.nodeEnv === 'test' }));

  return app;
}
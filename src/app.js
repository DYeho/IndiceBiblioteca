import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { createSessionMiddleware } from './middleware/session.middleware.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { verifyOriginAndContentType } from './middleware/origin.middleware.js';
import { createApiLimiter } from './middleware/rate-limit.middleware.js';
import { createErrorHandler, notFoundApi } from './middleware/error.middleware.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createBooksRepository } from './modules/books/books.repository.js';
import { createBooksService } from './modules/books/books.service.js';
import { createBooksController } from './modules/books/books.controller.js';
import {
  registerBooksRoutes,
  registerBookSearchRoutes,
  registerBookShelfRoutes,
  registerBookEditRoutes,
} from './modules/books/books.routes.js';
import { registerShelfAssignmentsRoutes } from './modules/books/shelf-assignments.routes.js';
import { normalizeText } from './utils/normalize-text.js';
import { unauthenticated } from './utils/errors.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/**
 * Application factory (SPEC-001 §6.6). Receives its dependencies so tests can build it with a
 * temporary database. `routers.books` is where the HU-002 / HU-006 router plugs in.
 * Test-only overrides: `sessionOptions` (short duration), `bcryptCost`, `apiLimiter`, `loginLimiter`, `logErrors`.
 */
export function createApp({ env, db, routers = {}, sessionOptions, bcryptCost, apiLimiter, loginLimiter, logErrors = true }) {
  const app = express();

  // 1. Proxy trust (TRUST_PROXY): needed to see the real IP behind Nginx.
  if (env.trustProxy) app.set('trust proxy', 1);

  // 2. Helmet with a content security policy: own origin only, no inline scripts or styles.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: env.nodeEnv === 'production' ? [] : null,
        },
      },
    }),
  );

  // 3. Session.
  const session = createSessionMiddleware(env, sessionOptions);
  app.use(session.middleware);

  // Module composition (routes → controller → service → repository).
  const authRepository = createAuthRepository(db);
  const authService = createAuthService({ repository: authRepository, bcryptCost });
  const { requireAdmin, adminPageGuard } = createAuthMiddleware({ authRepository });

  // 4. /api: no-store, JSON reader (16 kB), origin and content type check, general limiter.
  const api = express.Router();
  api.use(noStore);
  api.use(apiLimiter ?? createApiLimiter());
  api.post('/books', (req, res, next) => {
    requireAdmin(req, res, (error) => {
      next(error?.code === 'UNAUTHENTICATED' ? unauthenticated('Debe iniciar sesión.') : error);
    });
  });
  // HU-003: the session is checked before origin, content type and body, as in POST /books (SPEC-002 §6).
  const requireAdminSession = (req, res, next) => {
    requireAdmin(req, res, (error) => {
      next(error?.code === 'UNAUTHENTICATED' ? unauthenticated('Debe iniciar sesión.') : error);
    });
  };
  api.put('/books/:id/shelf', requireAdminSession);
  if (!routers.books) {
    api.get('/books/:id', requireAdminSession);
    api.put('/books/:id', requireAdminSession, express.json({ limit: '16kb', strict: false }));
  }
  api.use(express.json({ limit: '16kb' }));
  api.use(verifyOriginAndContentType({ allowedOrigin: env.allowedOrigin }));

  // 5. Routes.
  api.use(
    '/auth',
    createAuthRouter({
      authController: createAuthController({ authService, clearSessionCookie: session.clearSessionCookie }),
      requireAdmin,
      loginLimiter,
    }),
  );
  // POST /api/books (admin registration, HU-002) and GET /api/books (public search, HU-006).
  const booksController = createBooksController({
    service: createBooksService({ repository: createBooksRepository(db), normalizeText }),
  });
  let booksRouter = routers.books;
  if (!booksRouter) {
    booksRouter = registerBooksRoutes(express.Router(), { requireAdmin, controller: booksController });
    registerBookSearchRoutes(booksRouter, { controller: booksController });
    registerBookShelfRoutes(booksRouter, { requireAdmin: requireAdminSession, controller: booksController });
    registerBookEditRoutes(booksRouter, { requireAdmin: requireAdminSession, controller: booksController });
  }
  api.use('/books', booksRouter);
  // GET /api/shelf-assignments (HU-003, admin only).
  api.use(
    '/shelf-assignments',
    registerShelfAssignmentsRoutes(express.Router(), { requireAdmin: requireAdminSession, controller: booksController }),
  );

  // 6. JSON 404 for the rest of /api.
  api.use(notFoundApi);
  app.use('/api', api);
  // /login (no extension) is not a page: send it to the login page.
  app.get('/login', (req, res) => res.redirect(302, '/login.html'));

  // 7. /admin guard, before the static files.
  app.use(adminPageGuard);

  // 8. Static files: only public/ is served, dotfiles are ignored.
  app.use(express.static(PUBLIC_DIR, { dotfiles: 'ignore' }));

  // 9. Error handler.
  app.use(createErrorHandler({ logErrors }));

  return app;
}

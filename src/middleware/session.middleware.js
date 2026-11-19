import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import { mkdirSync } from 'node:fs';

export const SESSION_COOKIE_NAME = 'ib.sid';
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

/**
 * Session configuration (SPEC-000 §4.8, SPEC-001 §8.1).
 * - Cookie ib.sid: HttpOnly, SameSite=Lax, Secure in production.
 * - 8 hours of inactivity (sliding expiration).
 * - Sessions are only created at login (saveUninitialized: false).
 * - Persistent store: connect-sqlite3 in data/sessions.sqlite (outside schema.sql).
 * `maxAgeMs` and `store` can be overridden (tests use a short duration).
 */
export function createSessionMiddleware(env, { maxAgeMs = EIGHT_HOURS_MS, store } = {}) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  };

  let sessionStore = store;
  if (!sessionStore) {
    mkdirSync(env.sessionsDir, { recursive: true });
    const SQLiteStore = connectSqlite3(session);
    sessionStore = new SQLiteStore({ dir: env.sessionsDir, db: env.sessionsDb });
  }

  const middleware = session({
    name: SESSION_COOKIE_NAME,
    secret: env.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { ...cookieOptions, maxAge: maxAgeMs },
  });

  const clearSessionCookie = (res) => res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);

  return { middleware, clearSessionCookie, store: sessionStore };
}
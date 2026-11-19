import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';

export const SESSION_COOKIE_NAME = 'ib.sid';

/**
 * Sesión con cookie ib.sid y almacén SQLite separado (SPEC-001 §8.1).
 * saveUninitialized=false: solo se crea sesión en el login exitoso.
 * rolling=true: expiración deslizante de 8 h de inactividad.
 */
export function createSessionMiddleware(config) {
  const SQLiteStore = connectSqlite3(session);
  const store = new SQLiteStore({ db: config.sessionsDb, dir: config.sessionsDir });

  const middleware = session({
    name: SESSION_COOKIE_NAME,
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: config.sessionMaxAgeMs,
    },
  });

  return { middleware, store };
}
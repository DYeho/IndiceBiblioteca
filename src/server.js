import { loadEnv } from './config/env.js';
import { existsSync } from 'node:fs';
import { openDatabase } from './database/conection.js';
import { createApp } from './app.js';

let db;
try {
  const env = loadEnv();
  const initializationMessage = 'La base de datos no está inicializada o requiere actualización. Ejecute npm run db:init.';
  if (!existsSync(env.databasePath)) throw new Error(initializationMessage);
  db = openDatabase(env.databasePath);
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('administrators', 'books', 'categories', 'schema_migrations')"
  ).all();
  const bookColumns = db.pragma('table_info(books)');
  if (tables.length !== 4 || !bookColumns.some(({ name }) => name === 'category_id')) {
    throw new Error(initializationMessage);
  }
  const app = createApp({ env, db });

  const server = app.listen(env.port, () => {
    console.log(`Índice Biblioteca listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  db?.close();
  console.error(error.message);
  process.exit(1);
}

import { mkdirSync } from 'node:fs';
import { loadConfig } from './config/env.js';
import { assertSchemaReady, openDatabase } from './database/connection.js';
import { createApp } from './app.js';

function main() {
  const config = loadConfig();

  let db;
  try {
    db = openDatabase(config.databasePath);
    assertSchemaReady(db);
  } catch (error) {
    throw new Error(
      `${error.message}\nLa base de datos (${config.databasePath}) no existe o está incompleta. Ejecute: npm run db:init`,
    );
  }

  mkdirSync(config.sessionsDir, { recursive: true });
  const app = createApp({ config, db });

  const server = app.listen(config.port, () => {
    console.log(`Índice Biblioteca escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
  });

  server.once('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `El puerto ${config.port} ya está en uso.` : error.message);
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
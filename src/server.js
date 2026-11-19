import { loadEnv } from './config/env.js';
import { initializeDatabase } from './database/conection.js';
import { createApp } from './app.js';

try {
  const env = loadEnv();
  const db = initializeDatabase(env.databasePath);
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
  console.error(error.message);
  process.exit(1);
}
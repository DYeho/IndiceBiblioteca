import { loadEnv } from '../src/config/env.js';
import { initializeDatabase } from '../src/database/conection.js';

let db;
try {
  db = initializeDatabase(loadEnv().databasePath);
  console.log('Base de datos inicializada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db?.close();
}

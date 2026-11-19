import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/env.js';
import { openDatabase } from '../src/database/connection.js';

const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'database', 'schema.sql');

try {
  const config = loadConfig();
  mkdirSync(path.dirname(config.databasePath), { recursive: true });

  const db = openDatabase(config.databasePath, { mustExist: false });
  try {
    db.exec(readFileSync(schemaPath, 'utf8'));
  } finally {
    db.close();
  }
  console.log(`Base de datos lista: ${config.databasePath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
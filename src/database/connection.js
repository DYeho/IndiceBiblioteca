import Database from 'better-sqlite3';

const REQUIRED_TABLES = ['administrators', 'books', 'schema_migrations'];

/**
 * Abre una conexión con los PRAGMAs obligatorios (SPEC-000 §4.11).
 * Con mustExist=true no crea el archivo si no existe.
 */
export function openDatabase(filePath, { mustExist = true } = {}) {
  const db = new Database(filePath, { fileMustExist: mustExist });
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

/** Lanza un Error si faltan tablas del esquema (SPEC-001 §5.1). */
export function assertSchemaReady(db) {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  const existing = new Set(rows.map((row) => row.name));
  const missing = REQUIRED_TABLES.filter((name) => !existing.has(name));
  if (missing.length > 0) {
    throw new Error(`Faltan tablas en la base de datos (${missing.join(', ')}). Ejecute: npm run db:init`);
  }
}
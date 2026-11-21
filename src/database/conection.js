import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
 
const SCHEMA_PATH = new URL('./schema.sql', import.meta.url);
 
export function openDatabase(filePath) {
  const db = new Database(filePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}
 
export function applySchema(db) {
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
}
 
export function initializeDatabase(filePath) {
  if (filePath !== ':memory:') {
    mkdirSync(dirname(resolve(filePath)), { recursive: true });
  }
  const db = openDatabase(filePath);
  applySchema(db);
  return db;
}
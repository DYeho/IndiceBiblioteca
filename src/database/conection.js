import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeText } from '../utils/normalize-text.js';
 
const SCHEMA_PATH = new URL('./schema.sql', import.meta.url);
const CATEGORY_MIGRATION = '001-book-categories';
const DEFAULT_CATEGORIES = [
  'Literatura',
  'Matemáticas',
  'Ciencias naturales',
  'Ciencias sociales',
  'Historia y geografía',
  'Arte y cultura',
  'Tecnología e informática',
  'Idiomas',
  'Referencia y consulta',
  'Otros',
];
 
export function openDatabase(filePath) {
  const db = new Database(filePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}
 
export function applySchema(db) {
  db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name, normalized_name)
    VALUES (?, ?)
  `);
  const categories = db.transaction(() => {
    for (const name of DEFAULT_CATEGORIES) {
      insertCategory.run(name, normalizeText(name));
    }

    const columns = db.pragma('table_info(books)');
    if (columns.some(({ name }) => name === 'category_id')) return;

    const otherCategory = db.prepare('SELECT id FROM categories WHERE normalized_name = ?')
      .get(normalizeText('Otros'));
    db.exec(`
      CREATE TABLE books_with_category (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        title             TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
        author            TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 150),
        description       TEXT CHECK (description IS NULL OR length(description) <= 2000),
        quantity          INTEGER NOT NULL
                          CHECK (typeof(quantity) = 'integer' AND quantity BETWEEN 0 AND 999),
        category_id       INTEGER NOT NULL REFERENCES categories(id),
        shelf_label       TEXT CHECK (shelf_label IS NULL OR length(shelf_label) BETWEEN 1 AND 30),
        title_normalized  TEXT NOT NULL CHECK (length(title_normalized) > 0),
        author_normalized TEXT NOT NULL CHECK (length(author_normalized) > 0),
        created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (title_normalized, author_normalized)
      )
    `);
    db.prepare(`
      INSERT INTO books_with_category (
        id, title, author, description, quantity, category_id, shelf_label,
        title_normalized, author_normalized, created_at, updated_at
      )
      SELECT id, title, author, description, quantity, ?, shelf_label,
             title_normalized, author_normalized, created_at, updated_at
      FROM books
    `).run(otherCategory.id);
    db.exec('DROP TABLE books; ALTER TABLE books_with_category RENAME TO books');
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(CATEGORY_MIGRATION);
  });
  categories();
}
 
export function initializeDatabase(filePath) {
  if (filePath !== ':memory:') {
    mkdirSync(dirname(resolve(filePath)), { recursive: true });
  }
  const db = openDatabase(filePath);
  applySchema(db);
  return db;
}
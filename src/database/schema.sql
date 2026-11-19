-- Esquema vigente de Índice Biblioteca (SPEC-001 §5). Idempotente: solo crea lo que falta.

CREATE TABLE IF NOT EXISTS administrators (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE
                CHECK (length(username) BETWEEN 3 AND 50 AND username = lower(username)),
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS books (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  author            TEXT    NOT NULL CHECK (length(author) BETWEEN 1 AND 150),
  description       TEXT    CHECK (description IS NULL OR length(description) <= 2000),
  quantity          INTEGER NOT NULL CHECK (typeof(quantity) = 'integer' AND quantity BETWEEN 0 AND 999),
  shelf_label       TEXT    CHECK (shelf_label IS NULL OR length(shelf_label) BETWEEN 1 AND 30),
  title_normalized  TEXT    NOT NULL,
  author_normalized TEXT    NOT NULL,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (title_normalized, author_normalized)
);

-- Se crea vacía: no hay migraciones en el Sprint 1 (D-11).
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
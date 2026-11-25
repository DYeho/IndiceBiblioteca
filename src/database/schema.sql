CREATE TABLE IF NOT EXISTS administrators (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE
                CHECK (length(username) BETWEEN 3 AND 50
                       AND username = trim(username)
                       AND username = lower(username)),
  password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  normalized_name TEXT NOT NULL UNIQUE CHECK (length(normalized_name) > 0),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS books (
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
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

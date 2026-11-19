CREATE TABLE IF NOT EXISTS administrators (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE
                CHECK (length(username) BETWEEN 3 AND 50
                       AND username = trim(username)
                       AND username = lower(username)),
  password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
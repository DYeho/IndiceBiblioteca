/**
 * Data access for administrator accounts. SQL only, no business rules.
 */
export function createAuthRepository(db) {
  const findByUsernameStatement = db.prepare(
    'SELECT id, username, password_hash FROM administrators WHERE username = ?'
  );
  const findByIdStatement = db.prepare('SELECT id, username FROM administrators WHERE id = ?');
  const insertStatement = db.prepare(
    'INSERT INTO administrators (username, password_hash) VALUES (?, ?)'
  );

  return {
    findByUsername(username) {
      const row = findByUsernameStatement.get(username);
      return row ? { id: row.id, username: row.username, passwordHash: row.password_hash } : null;
    },

    findById(id) {
      return findByIdStatement.get(id) ?? null;
    },

    insert(username, passwordHash) {
      const result = insertStatement.run(username, passwordHash);
      return { id: Number(result.lastInsertRowid), username };
    },
  };
}
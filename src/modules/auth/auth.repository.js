export function createAuthRepository(db) {
  const findByUsernameStatement = db.prepare(
    'SELECT id, username, password_hash AS passwordHash FROM administrators WHERE username = ?',
  );
  const findByIdStatement = db.prepare('SELECT id, username FROM administrators WHERE id = ?');
  const insertStatement = db.prepare('INSERT INTO administrators (username, password_hash) VALUES (?, ?)');

  return {
    findByUsername(username) {
      return findByUsernameStatement.get(username);
    },
    findById(id) {
      return findByIdStatement.get(id);
    },
    insert(username, passwordHash) {
      return Number(insertStatement.run(username, passwordHash).lastInsertRowid);
    },
  };
}
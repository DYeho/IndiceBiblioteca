function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    quantity: row.quantity,
    shelfLabel: row.shelf_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBooksRepository(database, { now = () => new Date().toISOString() } = {}) {
  const findByNormalizedKey = database.prepare(`
    SELECT id FROM books
    WHERE title_normalized = ? AND author_normalized = ?
    LIMIT 1
  `);
  const insertBook = database.prepare(`
    INSERT INTO books (
      title, author, description, quantity,
      title_normalized, author_normalized,
      shelf_label, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `);
  const getBook = database.prepare(`
    SELECT id, title, author, description, quantity,
           shelf_label, created_at, updated_at
    FROM books WHERE id = ?
  `);

  return {
    findByNormalizedKey(titleNormalized, authorNormalized) {
      return findByNormalizedKey.get(titleNormalized, authorNormalized) ?? null;
    },
    insert(book) {
      const timestamp = now();
      const result = insertBook.run(
        book.title,
        book.author,
        book.description,
        book.quantity,
        book.titleNormalized,
        book.authorNormalized,
        timestamp,
        timestamp,
      );
      return mapBook(getBook.get(result.lastInsertRowid));
    },
  };
}

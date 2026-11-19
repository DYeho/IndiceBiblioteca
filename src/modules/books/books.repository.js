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
  // T-19: coincidencia con instr() sobre las columnas normalizadas (D-10).
  // No se usa LIKE: no hay comodines que escapar. El texto va siempre como parámetro.
  const searchStatement = database.prepare(`
    SELECT id, title, author, quantity, shelf_label AS shelfLabel
    FROM books
    WHERE instr(title_normalized, @text) > 0
       OR instr(author_normalized, @text) > 0
    ORDER BY title_normalized, author_normalized, id
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
    /** @param {string} normalizedText texto ya normalizado y no vacío */
    search(normalizedText) {
      return searchStatement.all({ text: normalizedText });
    },
  };
}

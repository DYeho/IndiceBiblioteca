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

  // HU-003 (T-29): listas de asignación de estante. Mismo orden que la búsqueda (RN-S07).
  const listUnassignedStatement = database.prepare(`
    SELECT id, title, author, quantity, shelf_label AS shelfLabel
    FROM books
    WHERE shelf_label IS NULL
    ORDER BY title_normalized, author_normalized, id
  `);
  const listAssignedStatement = database.prepare(`
    SELECT id, title, author, quantity, shelf_label AS shelfLabel
    FROM books
    WHERE shelf_label IS NOT NULL
    ORDER BY title_normalized, author_normalized, id
  `);
  // Una sola sentencia. `IS NOT` compara también con NULL: si la etiqueta es la misma no se
  // modifica ninguna fila y updated_at queda igual (D-18, RN-S09).
  const updateShelfStatement = database.prepare(`
    UPDATE books
    SET shelf_label = @shelfLabel, updated_at = @updatedAt
    WHERE id = @id AND shelf_label IS NOT @shelfLabel
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
    /** @returns {object|null} el libro completo (sin columnas normalizadas) o null si no existe */
    findById(id) {
      const row = getBook.get(id);
      return row ? mapBook(row) : null;
    },
    /** Libros con shelf_label nulo: id, title, author, quantity y shelfLabel (siempre null). */
    listUnassigned() {
      return listUnassignedStatement.all();
    },
    /** Libros con shelf_label asignado: id, title, author, quantity y shelfLabel. */
    listAssigned() {
      return listAssignedStatement.all();
    },
    /**
     * Guarda la etiqueta ya recortada y validada. Devuelve el libro completo, o null si ya no existe.
     * Si la etiqueta es idéntica a la guardada, updated_at no cambia.
     */
    updateShelf(id, shelfLabel) {
      updateShelfStatement.run({ id, shelfLabel, updatedAt: now() });
      return this.findById(id);
    },
    /** @param {string} normalizedText texto ya normalizado y no vacío */
    search(normalizedText) {
      return searchStatement.all({ text: normalizedText });
    },
  };
}
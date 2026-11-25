function mapBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    quantity: row.quantity,
    categoryId: row.category_id,
    category: row.category_name,
    shelfLabel: row.shelf_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBooksRepository(database, { now = () => new Date().toISOString() } = {}) {
  const findByNormalizedKey = database.prepare(`
    SELECT id FROM books
    WHERE title_normalized = ? AND author_normalized = ? AND id IS NOT ?
    LIMIT 1
  `);
  const insertBook = database.prepare(`
    INSERT INTO books (
      title, author, description, quantity, category_id,
      title_normalized, author_normalized,
      shelf_label, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `);
  const getBook = database.prepare(`
    SELECT books.id, books.title, books.author, books.description, books.quantity,
           books.category_id, categories.name AS category_name,
           books.shelf_label, books.created_at, books.updated_at
    FROM books
    JOIN categories ON categories.id = books.category_id
    WHERE books.id = ?
  `);
  const updateBook = database.prepare(`
    UPDATE books
    SET title = @title, author = @author, description = @description, quantity = @quantity,
        category_id = @categoryId,
        title_normalized = @titleNormalized, author_normalized = @authorNormalized,
        updated_at = CASE
          WHEN @updatedAt > updated_at THEN @updatedAt
          ELSE strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+0.001 seconds')
        END
    WHERE id = @id
      AND (title IS NOT @title OR author IS NOT @author OR description IS NOT @description
           OR quantity IS NOT @quantity OR category_id IS NOT @categoryId
           OR title_normalized IS NOT @titleNormalized
           OR author_normalized IS NOT @authorNormalized)
  `);

  function findById(id) {
    const row = getBook.get(id);
    return row ? mapBook(row) : null;
  }

  const update = database.transaction((id, book) => {
    updateBook.run({ ...book, id, updatedAt: now() });
    return findById(id);
  });

  // T-19: coincidencia con instr() sobre las columnas normalizadas (D-10).
  // No se usa LIKE: no hay comodines que escapar. El texto va siempre como parámetro.
  const searchStatement = database.prepare(`
    SELECT books.id, books.title, books.author, books.quantity,
           books.shelf_label AS shelfLabel, categories.name AS category
    FROM books
    JOIN categories ON categories.id = books.category_id
    WHERE instr(books.title_normalized, @text) > 0
       OR instr(books.author_normalized, @text) > 0
    ORDER BY books.title_normalized, books.author_normalized, books.id
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
  // HU-005 (T-37): borrado físico en una sola sentencia (D-19, RN-D07).
  const deleteBookStatement = database.prepare('DELETE FROM books WHERE id = ?');
  const findCategoryStatement = database.prepare(`
    SELECT id, name FROM categories WHERE id = ?
  `);
  const findCategoryByNameStatement = database.prepare(`
    SELECT id, name FROM categories WHERE normalized_name = ?
  `);
  const listCategoriesStatement = database.prepare(`
    SELECT id, name FROM categories ORDER BY normalized_name, id
  `);
  const insertCategoryStatement = database.prepare(`
    INSERT INTO categories (name, normalized_name) VALUES (@name, @normalizedName)
  `);

  return {
    findByNormalizedKey(titleNormalized, authorNormalized, excludedId = null) {
      return findByNormalizedKey.get(titleNormalized, authorNormalized, excludedId) ?? null;
    },
    insert(book) {
      const timestamp = now();
      const result = insertBook.run(
        book.title,
        book.author,
        book.description,
        book.quantity,
        book.categoryId,
        book.titleNormalized,
        book.authorNormalized,
        timestamp,
        timestamp,
      );
      return mapBook(getBook.get(result.lastInsertRowid));
    },
    /** @returns {object|null} el libro completo (sin columnas normalizadas) o null si no existe */
    findById,
    update,
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
    /**
     * HU-005: elimina la fila completa del libro con una sola sentencia.
     * @returns {boolean} true si se eliminó una fila; false si el libro no existía
     */
    deleteById(id) {
      return deleteBookStatement.run(id).changes > 0;
    },
    /** @param {string} normalizedText texto ya normalizado y no vacío */
    search(normalizedText) {
      return searchStatement.all({ text: normalizedText });
    },
    listCategories() {
      return listCategoriesStatement.all();
    },
    findCategoryById(id) {
      return findCategoryStatement.get(id) ?? null;
    },
    findCategoryByNormalizedName(normalizedName) {
      return findCategoryByNameStatement.get(normalizedName) ?? null;
    },
    insertCategory(category) {
      const result = insertCategoryStatement.run(category);
      return findCategoryStatement.get(result.lastInsertRowid);
    },
  };
}

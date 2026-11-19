export function createBooksRepository(db) {
  // T-19: coincidencia con instr() sobre las columnas normalizadas (D-10).
  // No se usa LIKE: no hay comodines que escapar. El texto va siempre como parámetro.
  const searchStatement = db.prepare(`
    SELECT id, title, author, quantity, shelf_label AS shelfLabel
    FROM books
    WHERE instr(title_normalized, @text) > 0
       OR instr(author_normalized, @text) > 0
    ORDER BY title_normalized, author_normalized, id
  `);

  return {
    /** @param {string} normalizedText texto ya normalizado y no vacío */
    search(normalizedText) {
      return searchStatement.all({ text: normalizedText });
    },
    // HU-002 (T-15) añade aquí findDuplicate() e insert().
  };
}
export function createBooksController({ booksService }) {
  return {
    /** GET /api/books?q= (público) */
    search(req, res) {
      const { books, total } = booksService.search(req.query.q);
      res.json({ data: books, meta: { total } });
    },
    // HU-002 (T-16) añade aquí create().
  };
}
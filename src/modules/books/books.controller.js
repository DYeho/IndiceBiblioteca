export function createBooksController({ service }) {
  if (!service || typeof service.registerBook !== 'function') {
    throw new TypeError('A books registration service is required.');
  }

  return {
    async register(req, res, next) {
      try {
        const book = await service.registerBook(req.body);
        res.status(201).json({ data: book });
      } catch (error) {
        next(error);
      }
    },

    /** GET /api/books?q= (público, HU-006) */
    search(req, res, next) {
      try {
        const { books, total } = service.searchBooks(req.query.q);
        res.json({ data: books, meta: { total } });
      } catch (error) {
        next(error);
      }
    },
  };
}

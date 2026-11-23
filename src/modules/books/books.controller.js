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

    /** GET /api/shelf-assignments?status= (solo Administración, HU-003) */
    listShelfAssignments(req, res, next) {
      try {
        const { books, total } = service.listShelfAssignments(req.query.status);
        res.json({ data: books, meta: { total } });
      } catch (error) {
        next(error);
      }
    },

    /** PUT /api/books/:id/shelf (solo Administración, HU-003) */
    assignShelf(req, res, next) {
      try {
        const book = service.assignShelf(req.params.id, req.body);
        res.json({ data: book });
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
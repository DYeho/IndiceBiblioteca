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

    listCategories(req, res, next) {
      try {
        res.json({ data: service.listCategories() });
      } catch (error) {
        next(error);
      }
    },

    createCategory(req, res, next) {
      try {
        const category = service.registerCategory(req.body);
        res.status(201).json({ data: category });
      } catch (error) {
        next(error);
      }
    },

    getById(req, res, next) {
      try {
        const book = service.getBookById(req.params.id);
        res.json({ data: book });
      } catch (error) {
        next(error);
      }
    },

    edit(req, res, next) {
      try {
        const book = service.editBook(req.params.id, req.body);
        res.json({ data: book });
      } catch (error) {
        next(error);
      }
    },

    /** DELETE /api/books/:id (solo Administración, HU-005): 204 sin cuerpo o 404 */
    remove(req, res, next) {
      try {
        service.deleteBook(req.params.id);
        res.status(204).end();
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

    searchAdmin(req, res, next) {
      try {
        const { books, total, page, pageSize, totalPages } = service.searchAdminBooks(req.query);
        res.json({ data: books, meta: { total, page, pageSize, totalPages } });
      } catch (error) {
        next(error);
      }
    },
  };
}

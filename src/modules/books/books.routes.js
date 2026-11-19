import { Router } from 'express';

export function createBooksRouter({ booksController }) {
  const router = Router();
  router.get('/', booksController.search); // público (RN-A11, RN-B01)
  // HU-002 (T-16) añade aquí: router.post('/', requireAdmin, booksController.create);
  return router;
}
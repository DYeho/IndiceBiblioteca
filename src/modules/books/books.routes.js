export function registerBooksRoutes(router, { requireAdmin, controller }) {
  if (!router || typeof router.post !== 'function' ||
      typeof requireAdmin !== 'function' ||
      !controller || typeof controller.register !== 'function') {
    throw new TypeError('A router, admin guard and books controller are required.');
  }

  router.post('/', requireAdmin, controller.register);
  return router;
}

// HU-006: búsqueda pública (RN-A11, RN-B01). Separada para no cambiar el registro de HU-002.
export function registerBookSearchRoutes(router, { controller }) {
  if (!router || typeof router.get !== 'function' ||
      !controller || typeof controller.search !== 'function') {
    throw new TypeError('A router and a books search controller are required.');
  }

  router.get('/', controller.search);
  return router;
}

// HU-003: asignación de estante de un libro (solo Administración).
export function registerBookShelfRoutes(router, { requireAdmin, controller }) {
  if (!router || typeof router.put !== 'function' ||
      typeof requireAdmin !== 'function' ||
      !controller || typeof controller.assignShelf !== 'function') {
    throw new TypeError('A router, admin guard and a shelf assignment controller are required.');
  }

  router.put('/:id/shelf', requireAdmin, controller.assignShelf);
  return router;
}
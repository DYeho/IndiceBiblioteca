export function registerBooksRoutes(router, { requireAdmin, controller }) {
  if (!router || typeof router.post !== 'function' ||
      typeof requireAdmin !== 'function' ||
      !controller || typeof controller.register !== 'function') {
    throw new TypeError('A router, admin guard and books controller are required.');
  }

  // HU-006: public search (RN-A11, RN-B01).
  router.get('/', controller.search);
  // HU-002: registration, admin only.
  router.post('/', requireAdmin, controller.register);
  return router;
}

export function registerBooksRoutes(router, { requireAdmin, controller }) {
  if (!router || typeof router.post !== 'function' ||
      typeof requireAdmin !== 'function' ||
      !controller || typeof controller.register !== 'function') {
    throw new TypeError('A router, admin guard and books controller are required.');
  }

  router.post('/', requireAdmin, controller.register);
  return router;
}

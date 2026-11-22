// HU-003: listas de asignación de estante (solo Administración). Excepción D-14.
export function registerShelfAssignmentsRoutes(router, { requireAdmin, controller }) {
  if (!router || typeof router.get !== 'function' ||
      typeof requireAdmin !== 'function' ||
      !controller || typeof controller.listShelfAssignments !== 'function') {
    throw new TypeError('A router, admin guard and a shelf assignments controller are required.');
  }

  router.get('/', requireAdmin, controller.listShelfAssignments);
  return router;
}
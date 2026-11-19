/**
 * Normalización única del proyecto (SPEC-000 §10 #6, SPEC-001 RN-T01).
 * La usan la búsqueda y la detección de duplicados.
 * Pasos: minúsculas, descomposición NFD, eliminar marcas diacríticas,
 * colapsar espacios internos y recortar los extremos.
 * Consecuencia aceptada: la ñ equivale a n.
 */
export function normalizeText(value) {
  if (typeof value !== 'string') {
    throw new TypeError('normalizeText espera un texto.');
  }
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function normalizeText(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Text must be a string.');
  }
  return value.trim().replace(/\s+/gu, ' ').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

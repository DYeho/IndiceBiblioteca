import { normalizeText } from '../../utils/normalize-text.js';
import { validationError } from '../../utils/errors.js';

export const MAX_SEARCH_LENGTH = 200; // D-06

const MESSAGES = {
  required: 'Escriba un título o autor para buscar.',
  tooLong: `El texto de búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`,
  repeated: 'El texto de búsqueda debe enviarse una sola vez.',
};

export function createBooksService({ booksRepository }) {
  return {
    /**
     * HU-006: busca por título o autor (SPEC-001 §6.3).
     * @param {unknown} rawQuery valor de req.query.q (puede ser undefined o un arreglo si se repite)
     * @returns {{ books: object[], total: number }}
     */
    search(rawQuery) {
      if (Array.isArray(rawQuery)) {
        throw validationError({ q: MESSAGES.repeated }, MESSAGES.repeated);
      }
      if (typeof rawQuery !== 'string') {
        throw validationError({ q: MESSAGES.required }, MESSAGES.required);
      }

      const trimmed = rawQuery.trim();
      const normalized = normalizeText(trimmed);
      if (normalized === '') {
        throw validationError({ q: MESSAGES.required }, MESSAGES.required);
      }
      if ([...trimmed].length > MAX_SEARCH_LENGTH) {
        throw validationError({ q: MESSAGES.tooLong }, MESSAGES.tooLong);
      }

      const books = booksRepository.search(normalized);
      return { books, total: books.length };
    },
    // HU-002 (T-15) añade aquí create().
  };
}
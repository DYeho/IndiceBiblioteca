import { validationError, conflict } from '../../utils/errors.js';

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_BOOK_QUANTITY = 1;
const MAX_BOOK_QUANTITY = 999;
const DUPLICATE_MESSAGE = 'Ese libro ya existe. Edite el libro existente.';

export const MAX_SEARCH_LENGTH = 200; // D-06

const SEARCH_MESSAGES = {
  required: 'Escriba un título o autor para buscar.',
  tooLong: `El texto de búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`,
  repeated: 'El texto de búsqueda debe enviarse una sola vez.',
};

function characterCount(value) {
  return Array.from(value).length;
}

export function createBooksService({ repository, normalizeText }) {
  if (!repository || typeof repository.findByNormalizedKey !== 'function' ||
      typeof repository.insert !== 'function' || typeof normalizeText !== 'function') {
    throw new TypeError('A books repository and text normalizer are required.');
  }

  return {
    registerBook(input) {
      const values = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const fields = {};
      const title = typeof values.title === 'string' ? values.title.trim() : '';
      const author = typeof values.author === 'string' ? values.author.trim() : '';
      let titleNormalized = '';
      let authorNormalized = '';

      if (!title) {
        fields.title = 'El título es obligatorio.';
      } else if (characterCount(title) > MAX_TITLE_LENGTH) {
        fields.title = 'El título no puede superar 200 caracteres.';
      } else {
        titleNormalized = normalizeText(title);
        if (!titleNormalized) fields.title = 'El título es obligatorio.';
      }

      if (!author) {
        fields.author = 'El autor es obligatorio.';
      } else if (characterCount(author) > MAX_AUTHOR_LENGTH) {
        fields.author = 'El autor no puede superar 150 caracteres.';
      } else {
        authorNormalized = normalizeText(author);
        if (!authorNormalized) fields.author = 'El autor es obligatorio.';
      }

      let description = null;
      if (values.description !== undefined && values.description !== null) {
        if (typeof values.description !== 'string') {
          fields.description = 'La descripción debe ser un texto.';
        } else {
          description = values.description.trim() || null;
          if (description !== null && characterCount(description) > MAX_DESCRIPTION_LENGTH) {
            fields.description = 'La descripción no puede superar 2000 caracteres.';
          }
        }
      }

      if (values.quantity === undefined) {
        fields.quantity = 'La cantidad inicial es obligatoria.';
      } else if (!Number.isInteger(values.quantity) ||
                 values.quantity < MIN_BOOK_QUANTITY ||
                 values.quantity > MAX_BOOK_QUANTITY) {
        fields.quantity = 'La cantidad inicial debe ser un número entero entre 1 y 999.';
      }

      if (Object.keys(fields).length > 0) {
        throw validationError('Los datos del libro no son válidos.', fields);
      }

      if (repository.findByNormalizedKey(titleNormalized, authorNormalized)) {
        throw conflict(DUPLICATE_MESSAGE);
      }

      try {
        return repository.insert({
          title,
          author,
          description,
          quantity: values.quantity,
          titleNormalized,
          authorNormalized,
        });
      } catch (error) {
        if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw conflict(DUPLICATE_MESSAGE);
        }
        throw error;
      }
    },

    /**
     * HU-006: busca por título o autor (SPEC-001 §6.3).
     * @param {unknown} rawQuery valor de req.query.q (puede ser undefined o un arreglo si se repite)
     * @returns {{ books: object[], total: number }}
     */
    searchBooks(rawQuery) {
      if (Array.isArray(rawQuery)) {
        throw validationError(SEARCH_MESSAGES.repeated, { q: SEARCH_MESSAGES.repeated });
      }
      if (typeof rawQuery !== 'string') {
        throw validationError(SEARCH_MESSAGES.required, { q: SEARCH_MESSAGES.required });
      }

      const trimmed = rawQuery.trim();
      const normalized = normalizeText(trimmed);
      if (normalized === '') {
        throw validationError(SEARCH_MESSAGES.required, { q: SEARCH_MESSAGES.required });
      }
      if (characterCount(trimmed) > MAX_SEARCH_LENGTH) {
        throw validationError(SEARCH_MESSAGES.tooLong, { q: SEARCH_MESSAGES.tooLong });
      }

      const books = repository.search(normalized);
      return { books, total: books.length };
    },
  };
}

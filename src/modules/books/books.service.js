import { validationError, conflict, notFound } from '../../utils/errors.js';

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_BOOK_QUANTITY = 1;
const MAX_BOOK_QUANTITY = 999;
const DUPLICATE_MESSAGE = 'Ese libro ya existe. Edite el libro existente.';

export const MAX_SEARCH_LENGTH = 200; // D-06
export const MAX_SHELF_LABEL_LENGTH = 30; // RN-S03

const SHELF_STATUSES = new Set(['unassigned', 'assigned']);
const SHELF_STATUS_MESSAGE = 'Indique si desea los libros sin estante o con estante.';
const BOOK_NOT_FOUND_MESSAGE = 'El libro no existe.';
const SHELF_MESSAGES = {
  required: 'El estante es obligatorio.',
  notText: 'El estante debe ser texto.',
  tooLong: `El estante no puede superar ${MAX_SHELF_LABEL_LENGTH} caracteres.`,
};

// D-20: an identifier that is not a positive integer is treated as a book that does not exist.
function parseBookId(rawId) {
  const value = typeof rawId === 'number' ? String(rawId) : rawId;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

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
     * HU-003: lista los libros sin estante (`unassigned`) o con estante (`assigned`) (SPEC-002 §6.1).
     * @param {unknown} rawStatus valor de req.query.status (puede ser undefined o un arreglo)
     * @returns {{ books: object[], total: number }}
     */
    listShelfAssignments(rawStatus) {
      if (typeof rawStatus !== 'string' || !SHELF_STATUSES.has(rawStatus)) {
        throw validationError(SHELF_STATUS_MESSAGE, { status: SHELF_STATUS_MESSAGE });
      }
      const books = rawStatus === 'unassigned' ? repository.listUnassigned() : repository.listAssigned();
      return { books, total: books.length };
    },

    /**
     * HU-003: asigna o cambia el estante de un libro (SPEC-002 §6.2).
     * Orden de comprobaciones (D-21): existencia del libro, validación, escritura.
     * @param {unknown} rawId identificador de la ruta
     * @param {unknown} input cuerpo de la solicitud
     * @returns {object} el libro completo con el estante guardado
     */
    assignShelf(rawId, input) {
      const id = parseBookId(rawId);
      if (id === null || repository.findById(id) === null) {
        throw notFound(BOOK_NOT_FOUND_MESSAGE);
      }

      const values = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const raw = values.shelfLabel;
      let message = null;
      let shelfLabel = '';
      if (raw === undefined || raw === null) {
        message = SHELF_MESSAGES.required;
      } else if (typeof raw !== 'string') {
        message = SHELF_MESSAGES.notText;
      } else {
        shelfLabel = raw.trim();
        if (shelfLabel === '') message = SHELF_MESSAGES.required;
        else if (characterCount(shelfLabel) > MAX_SHELF_LABEL_LENGTH) message = SHELF_MESSAGES.tooLong;
      }
      if (message) {
        throw validationError('El estante no es válido.', { shelfLabel: message });
      }

      // The book may have been deleted between the check and the write.
      const book = repository.updateShelf(id, shelfLabel);
      if (book === null) throw notFound(BOOK_NOT_FOUND_MESSAGE);
      return book;
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
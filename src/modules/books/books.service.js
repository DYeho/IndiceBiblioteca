import { validationError, conflict, notFound } from '../../utils/errors.js';

const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_CATEGORY_LENGTH = 60;
const ADMIN_SEARCH_PAGE_SIZE = 10;
const MIN_BOOK_QUANTITY = 1;
const MAX_BOOK_QUANTITY = 999;
const DUPLICATE_MESSAGE = 'Ese libro ya existe. Edite el libro existente.';
const DUPLICATE_CATEGORY_MESSAGE = 'Ya existe una categoría con ese nombre.';

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
const ADMIN_SEARCH_MESSAGES = {
  repeatedQuery: 'El texto de búsqueda debe enviarse una sola vez.',
  invalidQuery: 'Escriba un texto de búsqueda válido.',
  tooLongQuery: `El texto de búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`,
  invalidCategory: 'Seleccione una categoría válida.',
  invalidPage: 'La página debe ser un entero positivo.',
};

function characterCount(value) {
  return Array.from(value).length;
}

function validateBook(input, normalizeText, repository, { editing = false } = {}) {
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

  const minimumQuantity = editing ? 0 : MIN_BOOK_QUANTITY;
  if (values.quantity === undefined) {
    fields.quantity = editing ? 'La cantidad es obligatoria.' : 'La cantidad inicial es obligatoria.';
  } else if (!Number.isInteger(values.quantity) || values.quantity < minimumQuantity || values.quantity > MAX_BOOK_QUANTITY) {
    fields.quantity = editing
      ? 'La cantidad debe ser un número entero entre 0 y 999.'
      : 'La cantidad inicial debe ser un número entero entre 1 y 999.';
  }

  let categoryId = null;
  if (!Number.isSafeInteger(values.categoryId) || values.categoryId < 1) {
    fields.categoryId = 'La categoría es obligatoria.';
  } else if (repository.findCategoryById(values.categoryId) === null) {
    fields.categoryId = 'La categoría seleccionada no existe.';
  } else {
    categoryId = values.categoryId;
  }

  if (editing && Object.hasOwn(values, 'shelfLabel')) {
    fields.shelfLabel = 'El estante no se modifica desde la edición. Use “Asignar estantes”.';
  }

  if (Object.keys(fields).length > 0) {
    throw validationError('Los datos del libro no son válidos.', fields);
  }

  return { title, author, description, quantity: values.quantity, categoryId, titleNormalized, authorNormalized };
}

function saveBook(write) {
  try {
    return write();
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict(DUPLICATE_MESSAGE);
    throw error;
  }
}

function saveCategory(write) {
  try {
    return write();
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict(DUPLICATE_CATEGORY_MESSAGE);
    throw error;
  }
}

export function createBooksService({ repository, normalizeText }) {
  if (
    !repository ||
    typeof repository.findByNormalizedKey !== 'function' ||
    typeof repository.insert !== 'function' ||
    typeof repository.findCategoryById !== 'function' ||
    typeof repository.findCategoryByNormalizedName !== 'function' ||
    typeof repository.listCategories !== 'function' ||
    typeof repository.insertCategory !== 'function' ||
    typeof repository.searchAdmin !== 'function' ||
    typeof repository.countAdminSearch !== 'function' ||
    typeof normalizeText !== 'function'
  ) {
    throw new TypeError('A books repository and text normalizer are required.');
  }

  function requireBook(rawId) {
    const id = parseBookId(rawId);
    const book = id === null ? null : repository.findById(id);
    if (book === null) throw notFound(BOOK_NOT_FOUND_MESSAGE);
    return book;
  }

  function checkDuplicate({ titleNormalized, authorNormalized }, excludedId) {
    if (repository.findByNormalizedKey(titleNormalized, authorNormalized, excludedId)) {
      throw conflict(DUPLICATE_MESSAGE);
    }
  }

  return {
    registerBook(input) {
      const book = validateBook(input, normalizeText, repository);
      checkDuplicate(book);
      return saveBook(() => repository.insert(book));
    },

    getBookById: requireBook,

    editBook(rawId, input) {
      const { id } = requireBook(rawId);
      const book = validateBook(input, normalizeText, repository, { editing: true });
      checkDuplicate(book, id);

      const updatedBook = saveBook(() => repository.update(id, book));
      if (updatedBook === null) throw notFound(BOOK_NOT_FOUND_MESSAGE);
      return updatedBook;
    },

    listCategories() {
      return repository.listCategories();
    },

    registerCategory(input) {
      const values = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      if (typeof values.name !== 'string') {
        throw validationError('La categoría no es válida.', { name: 'El nombre de la categoría es obligatorio.' });
      }

      const name = values.name.trim();
      if (!name) {
        throw validationError('La categoría no es válida.', { name: 'El nombre de la categoría es obligatorio.' });
      }
      if (characterCount(name) > MAX_CATEGORY_LENGTH) {
        throw validationError('La categoría no es válida.', {
          name: `La categoría no puede superar ${MAX_CATEGORY_LENGTH} caracteres.`,
        });
      }

      const normalizedName = normalizeText(name);
      if (!normalizedName) {
        throw validationError('La categoría no es válida.', { name: 'El nombre de la categoría es obligatorio.' });
      }
      if (repository.findCategoryByNormalizedName(normalizedName)) {
        throw conflict(DUPLICATE_CATEGORY_MESSAGE);
      }

      return saveCategory(() => repository.insertCategory({ name, normalizedName }));
    },

    /**
     * HU-005: elimina un libro (SPEC-002 §6.5). Una sola sentencia: si no afecta ninguna fila,
     * el libro no existe (o ya fue eliminado) y se responde 404 (D-19, D-20).
     * @param {unknown} rawId identificador de la ruta
     */
    deleteBook(rawId) {
      const id = parseBookId(rawId);
      if (id === null || !repository.deleteById(id)) throw notFound(BOOK_NOT_FOUND_MESSAGE);
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

    searchAdminBooks(rawQuery) {
      const values = rawQuery && typeof rawQuery === 'object' && !Array.isArray(rawQuery) ? rawQuery : {};
      const fields = {};
      let text = null;
      let categoryId = null;
      let requestedPage = 1;

      if (Array.isArray(values.q)) {
        fields.q = ADMIN_SEARCH_MESSAGES.repeatedQuery;
      } else if (values.q !== undefined && typeof values.q !== 'string') {
        fields.q = ADMIN_SEARCH_MESSAGES.invalidQuery;
      } else if (typeof values.q === 'string' && values.q.trim() !== '') {
        const trimmed = values.q.trim();
        if (characterCount(trimmed) > MAX_SEARCH_LENGTH) {
          fields.q = ADMIN_SEARCH_MESSAGES.tooLongQuery;
        } else {
          text = normalizeText(trimmed);
          if (!text) fields.q = ADMIN_SEARCH_MESSAGES.invalidQuery;
        }
      }

      if (Array.isArray(values.categoryId)) {
        fields.categoryId = ADMIN_SEARCH_MESSAGES.invalidCategory;
      } else if (values.categoryId !== undefined && values.categoryId !== '') {
        if (typeof values.categoryId !== 'string' || !/^[1-9]\d*$/.test(values.categoryId)) {
          fields.categoryId = ADMIN_SEARCH_MESSAGES.invalidCategory;
        } else {
          categoryId = Number(values.categoryId);
          if (!Number.isSafeInteger(categoryId) || repository.findCategoryById(categoryId) === null) {
            fields.categoryId = ADMIN_SEARCH_MESSAGES.invalidCategory;
          }
        }
      }

      if (Array.isArray(values.page) || (values.page !== undefined && (
        typeof values.page !== 'string' || !/^[1-9]\d*$/.test(values.page)
      ))) {
        fields.page = ADMIN_SEARCH_MESSAGES.invalidPage;
      } else if (values.page !== undefined) {
        requestedPage = Number(values.page);
        if (!Number.isSafeInteger(requestedPage)) fields.page = ADMIN_SEARCH_MESSAGES.invalidPage;
      }

      if (Object.keys(fields).length > 0) {
        throw validationError('Los filtros de búsqueda no son válidos.', fields);
      }

      const total = repository.countAdminSearch({ text, categoryId });
      const totalPages = Math.ceil(total / ADMIN_SEARCH_PAGE_SIZE);
      const page = Math.min(requestedPage, Math.max(totalPages, 1));
      const books = repository.searchAdmin({
        text,
        categoryId,
        limit: ADMIN_SEARCH_PAGE_SIZE,
        offset: (page - 1) * ADMIN_SEARCH_PAGE_SIZE,
      });

      return { books, total, page, pageSize: ADMIN_SEARCH_PAGE_SIZE, totalPages };
    },
  };
}

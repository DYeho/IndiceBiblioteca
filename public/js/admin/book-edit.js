import { request, ApiError } from '../shared/api.js';
import { clearFieldError, clearMessage, setBusy, setFieldError, showMessage } from '../shared/utils.js';
import { initializeCategoryPicker } from './categories.js';

const LOAD_ERROR_TEXT = 'No se pudo cargar el libro. Inténtelo de nuevo.';
const SAVE_ERROR_TEXT = 'No se pudieron guardar los cambios. Inténtelo de nuevo.';
const NOT_FOUND_TEXT = 'El libro no existe.';
const DUPLICATE_TEXT = 'Ese libro ya existe. Edite el libro existente.';
const INVALID_TEXT = 'Los datos del libro no son válidos.';
const QUANTITY_TEXT = 'La cantidad debe ser un número entero entre 0 y 999.';

// Same messages as the backend, which is always the authority (SPEC-002 §6.4).
// Unlike the registration form, the quantity may be 0.
export function validateEditForm(values) {
  const title = values.title.trim();
  const author = values.author.trim();
  const description = values.description.trim();
  const quantityText = values.quantity.trim();
  const quantity = Number(quantityText);
  const categoryIdText = typeof values.categoryId === 'string' ? values.categoryId.trim() : '';
  const categoryId = Number(categoryIdText);
  const fields = {};

  for (const [name, value, label, limit] of [
    ['title', title, 'El título', 200],
    ['author', author, 'El autor', 150],
  ]) {
    if (!value) {
      fields[name] = `${label} es obligatorio.`;
    } else if (Array.from(value).length > limit) {
      fields[name] = `${label} no puede superar ${limit} caracteres.`;
    } else if (!value.normalize('NFD').replace(/\p{M}/gu, '')) {
      fields[name] = `${label} es obligatorio.`;
    }
  }
  if (Array.from(description).length > 2000) {
    fields.description = 'La descripción no puede superar 2000 caracteres.';
  }
  if (!quantityText) {
    fields.quantity = 'La cantidad es obligatoria.';
  } else if (!/^[0-9]+$/u.test(quantityText) || !Number.isInteger(quantity) || quantity > 999) {
    fields.quantity = QUANTITY_TEXT;
  }
  if (!/^[1-9]\d*$/u.test(categoryIdText) || !Number.isSafeInteger(categoryId)) {
    fields.categoryId = 'Seleccione una categoría.';
  }

  return { body: { title, author, description, quantity, categoryId }, fields };
}

function copiesText(quantity) {
  return quantity === 1 ? '1 ejemplar' : `${quantity} ejemplares`;
}

// HU-004: section "Editar libro" (SPEC-002 §7.4).
export function initializeBookEdit({ showSection, messages, repeatSearch, focusEditButton }) {
  const form = document.getElementById('edit-form');
  if (!form) return { open() {} };

  const heading = document.getElementById('titulo-editar');
  const editMessages = document.getElementById('edit-messages');
  const state = document.getElementById('edit-state');
  const shelfLine = document.getElementById('edit-shelf');
  const submit = document.getElementById('save-edit');
  const cancel = document.getElementById('cancel-edit');
  const categoryPicker = initializeCategoryPicker('edit');
  const fields = Object.fromEntries(['title', 'author', 'categoryId', 'description', 'quantity'].map(name => [name, {
    input: form.elements.namedItem(name),
    error: document.getElementById(name === 'categoryId' ? 'edit-category-error' : `edit-${name}-error`),
  }]));

  let currentId = null;
  let loadToken = 0; // a response from an older load never overwrites a newer one

  function clearErrors() {
    clearMessage(editMessages);
    for (const { input, error } of Object.values(fields)) clearFieldError(input, error);
  }

  function showFieldErrors(errors) {
    let firstInvalid;
    for (const [name, field] of Object.entries(fields)) {
      if (!errors[name]) continue;
      setFieldError(field.input, field.error, errors[name]);
      firstInvalid ??= field.input;
    }
    showMessage(editMessages, INVALID_TEXT);
    (firstInvalid ?? heading).focus();
  }

  // Goes back to "Buscar libros", repeats the last search and announces `text` (D-25).
  function backToSearch(text, kind) {
    currentId = null;
    loadToken += 1;
    showSection('buscar');
    showMessage(messages, text, kind);
    repeatSearch();
    messages.focus();
  }

  function fillForm(book) {
    fields.title.input.value = book.title;
    fields.author.input.value = book.author;
    categoryPicker.setSelected(book.categoryId);
    fields.description.input.value = book.description ?? '';
    fields.quantity.input.value = String(book.quantity);
    shelfLine.textContent = book.shelfLabel ? `Estante: ${book.shelfLabel}` : 'Estante no asignado';
    state.hidden = true;
    form.hidden = false;
    fields.title.input.focus();
  }

  async function open(bookId) {
    currentId = bookId;
    const token = ++loadToken;
    clearMessage(messages);
    clearErrors();
    form.reset();
    form.hidden = true;
    state.hidden = false;
    state.textContent = 'Cargando…';
    showSection('editar');
    heading.focus();

    try {
      const book = await request(`/api/books/${bookId}`);
      if (token !== loadToken) return;
      fillForm(book);
    } catch (error) {
      if (token !== loadToken) return;
      if (error instanceof ApiError && error.status === 401) return;
      if (error instanceof ApiError && error.status === 404) {
        backToSearch(NOT_FOUND_TEXT, 'error');
        return;
      }
      state.hidden = true;
      showMessage(editMessages, LOAD_ERROR_TEXT);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || currentId === null) return;
    clearErrors();
    const values = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.input.value]));
    const { body, fields: errors } = validateEditForm(values);
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    const token = loadToken;
    setBusy(submit, true);
    cancel.disabled = true;
    try {
      const book = await request(`/api/books/${currentId}`, { method: 'PUT', body });
      if (token !== loadToken) return;
      backToSearch(
        `Libro actualizado correctamente: «${book.title}» de ${book.author}, categoría ${book.category}, ${copiesText(book.quantity)}.`,
        'success',
      );
    } catch (error) {
      if (token !== loadToken) return;
      if (error instanceof ApiError && error.status === 401) return;
      if (error instanceof ApiError && error.status === 400) {
        showFieldErrors(error.fields);
      } else if (error instanceof ApiError && error.status === 404) {
        backToSearch(NOT_FOUND_TEXT, 'error');
      } else if (error instanceof ApiError && error.status === 409) {
        showMessage(editMessages, DUPLICATE_TEXT);
        fields.title.input.focus();
      } else {
        showMessage(editMessages, SAVE_ERROR_TEXT);
        fields.title.input.focus();
      }
    } finally {
      setBusy(submit, false);
      cancel.disabled = false;
    }
  });

  cancel.addEventListener('click', () => {
    const id = currentId;
    currentId = null;
    loadToken += 1;
    showSection('buscar');
    focusEditButton(id);
  });

  return { open };
}
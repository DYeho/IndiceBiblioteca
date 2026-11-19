import { request, ApiError } from '../shared/api.js';
import { clearFieldError, clearMessage, setBusy, setFieldError, showMessage } from '../shared/utils.js';

export function validateBookForm(values) {
  const title = values.title.trim();
  const author = values.author.trim();
  const description = values.description.trim();
  const quantityText = values.quantity.trim();
  const quantity = Number(quantityText);
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
    fields.quantity = 'La cantidad inicial es obligatoria.';
  } else if (!/^[0-9]+$/u.test(quantityText) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    fields.quantity = 'La cantidad inicial debe ser un número entero entre 1 y 999.';
  }

  return { body: { title, author, description, quantity }, fields };
}

export function initializeBookRegistration() {
  const form = document.getElementById('book-form');
  if (!form) return;
  const messages = document.getElementById('book-messages');
  const submit = document.getElementById('register-book');
  const fields = Object.fromEntries(['title', 'author', 'description', 'quantity'].map(name => [name, {
    input: form.elements.namedItem(name),
    error: document.getElementById(`book-${name}-error`),
  }]));

  function showErrors(errors) {
    let firstInvalid;
    for (const [name, text] of Object.entries(errors)) {
      if (fields[name]) {
        setFieldError(fields[name].input, fields[name].error, text);
        firstInvalid ??= fields[name].input;
      }
    }
    showMessage(messages, 'Los datos del libro no son válidos.');
    firstInvalid?.focus();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    clearMessage(messages);
    for (const { input, error } of Object.values(fields)) clearFieldError(input, error);
    const values = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.input.value]));
    const { body, fields: errors } = validateBookForm(values);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }

    setBusy(submit, true);
    try {
      const book = await request('/api/books', { method: 'POST', body });
      form.reset();
      showMessage(messages, `Libro registrado correctamente: «${book.title}» de ${book.author}, ${book.quantity} ejemplares.`, 'success');
      fields.title.input.focus();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      if (error instanceof ApiError && error.status === 400) {
        showErrors(error.fields);
      } else if (error instanceof ApiError && error.status === 409) {
        showMessage(messages, 'Ese libro ya existe. Edite el libro existente.');
      } else {
        showMessage(messages, 'No se pudo registrar el libro. Inténtelo de nuevo.');
      }
    } finally {
      setBusy(submit, false);
    }
  });
}

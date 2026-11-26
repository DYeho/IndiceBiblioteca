import { request, ApiError } from '../shared/api.js';
import { clearFieldError, clearMessage, createElement, setBusy, setFieldError, showMessage } from '../shared/utils.js';
import { initializeCategoryPicker } from './categories.js';

export function validateBookForm(values) {
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
    fields.quantity = 'La cantidad inicial es obligatoria.';
  } else if (!/^[0-9]+$/u.test(quantityText) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    fields.quantity = 'La cantidad inicial debe ser un número entero entre 1 y 999.';
  }
  if (!/^[1-9]\d*$/u.test(categoryIdText) || !Number.isSafeInteger(categoryId)) {
    fields.categoryId = 'Seleccione una categoría.';
  }

  return { body: { title, author, description, quantity, categoryId }, fields };
}

export function initializeBookRegistration() {
  const form = document.getElementById('book-form');
  if (!form) return;
  const messages = document.getElementById('book-messages');
  const submit = document.getElementById('register-book');
  initializeCategoryPicker('book');
  const fields = Object.fromEntries(['title', 'author', 'categoryId', 'description', 'quantity'].map(name => [name, {
    input: form.elements.namedItem(name),
    error: document.getElementById(name === 'categoryId' ? 'book-category-error' : `book-${name}-error`),
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
      showMessage(messages, `Libro registrado correctamente: «${book.title}» de ${book.author}, categoría ${book.category}, ${book.quantity} ejemplares.`, 'success');
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

const MAX_SEARCH_LENGTH = 200;

function renderState(container, text, modifier) {
  const className = modifier ? `state state-${modifier}` : 'state';
  container.replaceChildren(createElement('p', { className, text }));
}

function createDetailRow(termText, valueNode) {
  const row = document.createElement('div');
  row.append(createElement('dt', { className: 'detail-term', text: termText }), valueNode);
  return row;
}

function formatAvailability(quantity) {
  if (quantity === 0) {
    const value = createElement('dd', { className: 'detail-value' });
    value.append(createElement('span', { className: 'badge-out-of-stock', text: 'Agotado (0 disponibles)' }));
    return value;
  }
  const text = quantity === 1 ? '1 disponible' : `${quantity} disponibles`;
  return createElement('dd', { className: 'detail-value', text });
}

// HU-006: búsqueda de libros en la sección "Buscar libros" de Administración.
export function initializeBookSearch({ onEdit, onDelete } = {}) {
  const form = document.getElementById('search-form');
  if (!form) return { repeatLastSearch() {}, focusEditButton() {} };
  const input = document.getElementById('search-input');
  const errorBox = document.getElementById('search-error');
  const submitButton = document.getElementById('search-submit');
  const summaryContainer = document.getElementById('search-summary');
  const resultsContainer = document.getElementById('results-container');
  const detailRegion = document.getElementById('detail-region');
  const categoryFilter = document.getElementById('search-category');
  const pagination = document.getElementById('search-pagination');
  const previousPageButton = document.getElementById('search-previous-page');
  const nextPageButton = document.getElementById('search-next-page');
  const pageInfo = document.getElementById('search-page-info');

  let activeCard = null;
  let lastSearch = null;
  let currentMeta = null;
  let searchToken = 0;
  let categoryLoadFailed = false;
  function showInputError(text) {
    errorBox.textContent = text;
    errorBox.hidden = text === '';
    if (text === '') {
      input.removeAttribute('aria-invalid');
    } else {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  function closeDetail({ restoreFocus = false } = {}) {
    const cardToFocus = activeCard;
    if (activeCard) {
      activeCard.removeAttribute('aria-current');
      activeCard = null;
    }
    detailRegion.replaceChildren();
    detailRegion.hidden = true;
    if (restoreFocus && cardToFocus) cardToFocus.focus();
  }

  function openDetail(book, card) {
    if (activeCard) activeCard.removeAttribute('aria-current');
    activeCard = card;
    activeCard.setAttribute('aria-current', 'true');

    const panel = createElement('div', { className: 'detail-panel' });
    const header = createElement('div', { className: 'detail-header' });
    header.append(createElement('h2', { className: 'detail-title', text: book.title }));

    const closeButton = createElement('button', {
      className: 'button button-secondary',
      text: 'Cerrar',
      attributes: { type: 'button' },
    });
    closeButton.addEventListener('click', () => closeDetail({ restoreFocus: true }));
    header.append(closeButton);

    const list = createElement('dl', { className: 'detail-list' });
    list.append(
      createDetailRow('Autor', createElement('dd', { className: 'detail-value', text: book.author })),
      createDetailRow('Categoría', createElement('dd', { className: 'detail-value', text: book.category })),
      createDetailRow('Estante', book.shelfLabel
        ? createElement('dd', { className: 'detail-value detail-shelf', text: book.shelfLabel })
        : createElement('dd', { className: 'detail-value', text: 'Sin estante asignado' })),
      createDetailRow('Ejemplares', formatAvailability(book.quantity)),
    );

    panel.append(header, list);
    detailRegion.replaceChildren(panel);
    detailRegion.hidden = false;
  }

  detailRegion.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail({ restoreFocus: true });
  });

  function renderResults(books) {
    closeDetail();
    const grid = createElement('ul', { className: 'results-grid' });

    for (const book of books) {
      const item = document.createElement('li');
      const card = createElement('button', { className: 'book-card', attributes: { type: 'button' } });
      card.append(createElement('span', { className: 'book-card-title', text: book.title }));
      card.append(createElement('span', { className: 'book-card-author', text: book.author }));
      card.append(createElement('span', { className: 'book-card-category', text: `Categoría: ${book.category}` }));
      card.append(createElement('span', {
        className: book.shelfLabel ? 'book-card-shelf' : 'book-card-author',
        text: book.shelfLabel ? `Estante ${book.shelfLabel}` : 'Sin estante asignado',
      }));
      if (book.quantity === 0) {
        card.append(createElement('span', { className: 'badge-out-of-stock', text: 'Agotado' }));
      }
      card.addEventListener('click', () => openDetail(book, card));

      // HU-004: acciones de la tarjeta. Van fuera del botón de la tarjeta porque un botón no puede contener otro.
      const actions = createElement('div', { className: 'book-card-actions' });
      const editButton = createElement('button', {
        className: 'btn btn-secondary',
        text: 'Editar',
        attributes: { type: 'button', 'aria-label': `Editar «${book.title}»`, 'data-book-id': String(book.id) },
      });
      editButton.addEventListener('click', () => onEdit?.(book, editButton));
      // HU-005: botón de peligro. Se distingue por el texto además del color.
      const deleteButton = createElement('button', {
        className: 'btn btn-danger',
        text: 'Eliminar',
        attributes: { type: 'button', 'aria-label': `Eliminar «${book.title}»`, 'data-delete-id': String(book.id) },
      });
      deleteButton.addEventListener('click', () => onDelete?.(book, deleteButton));
      actions.append(editButton, deleteButton);

      item.append(card, actions);
      grid.append(item);
    }

    resultsContainer.replaceChildren(grid);
  }

  function updatePagination(meta) {
    currentMeta = meta;
    const totalPages = meta?.totalPages ?? 0;
    const page = meta?.page ?? 1;
    pagination.hidden = totalPages <= 1;
    pageInfo.textContent = totalPages === 0 ? 'Sin resultados' : `Página ${page} de ${totalPages}`;
    previousPageButton.disabled = page <= 1;
    nextPageButton.disabled = totalPages === 0 || page >= totalPages;
  }

  void request('/api/categories')
    .then(categories => {
      const currentCategory = categoryFilter.value;
      const options = [document.createElement('option')];
      options[0].value = '';
      options[0].textContent = 'Todas las categorías';
      for (const category of categories) {
        const option = document.createElement('option');
        option.value = String(category.id);
        option.textContent = category.name;
        options.push(option);
      }
      categoryFilter.replaceChildren(...options);
      categoryFilter.value = currentCategory;
    })
    .catch(() => {
      categoryLoadFailed = true;
      categoryFilter.disabled = true;
      summaryContainer.replaceChildren(createElement('p', {
        className: 'state state-error',
        text: 'No se pudieron cargar las categorías. Recargue la página e inténtelo de nuevo.',
      }));
    });

  renderState(resultsContainer, 'Busca por título o autor, o elige una categoría para consultar libros.');

  async function runSearch({ query, categoryId, page }) {
    const token = ++searchToken;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryId) params.set('categoryId', categoryId);
    params.set('page', String(page));

    showInputError('');
    closeDetail();
    summaryContainer.replaceChildren();
    renderState(resultsContainer, 'Buscando libros...', 'loading');
    updatePagination(null);
    setBusy(submitButton, true);
    categoryFilter.disabled = true;

    try {
      const { data: books, meta } = await request(`/api/admin/books?${params}`, { includeMeta: true });
      if (token !== searchToken) return;
      if (!meta || !Array.isArray(books)) throw new Error('Invalid paginated search response.');
      lastSearch = { query, categoryId, page: meta.page };
      const total = meta.total;
      updatePagination(meta);
      summaryContainer.replaceChildren(createElement('p', {
        className: 'results-summary',
        text: total === 0
          ? '0 resultados'
          : `${total === 1 ? '1 resultado' : `${total} resultados`} · Página ${meta.page} de ${meta.totalPages}`,
      }));
      if (total === 0) {
        renderState(resultsContainer, query || categoryId
          ? 'No se encontraron libros con esos filtros.'
          : 'Aún no hay libros registrados.');
      } else {
        renderResults(books);
      }
    } catch (error) {
      if (token !== searchToken) return;
      summaryContainer.replaceChildren();
      if (error instanceof ApiError && error.status === 401) return;
      if (error instanceof ApiError && error.status === 400) {
        if (error.fields?.q) {
          showInputError(error.fields.q);
          input.focus();
        }
        renderState(resultsContainer, error.message, 'error');
      } else if (error instanceof ApiError && error.status === 429) {
        renderState(resultsContainer, 'Demasiadas solicitudes. Inténtelo de nuevo más tarde.', 'error');
      } else {
        renderState(resultsContainer, 'No se pudo conectar con el servidor.', 'error');
      }
    } finally {
      if (token === searchToken) {
        setBusy(submitButton, false);
        categoryFilter.disabled = categoryLoadFailed;
        updatePagination(currentMeta);
      }
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = input.value.trim();

    if (Array.from(query).length > MAX_SEARCH_LENGTH) {
      showInputError(`El texto de búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`);
      input.focus();
      return;
    }

    await runSearch({ query, categoryId: categoryFilter.value, page: 1 });
  });

  categoryFilter.addEventListener('change', () => {
    void runSearch({ query: input.value.trim(), categoryId: categoryFilter.value, page: 1 });
  });
  previousPageButton.addEventListener('click', () => {
    if (lastSearch && currentMeta?.page > 1) {
      void runSearch({ ...lastSearch, page: currentMeta.page - 1 });
    }
  });
  nextPageButton.addEventListener('click', () => {
    if (lastSearch && currentMeta && currentMeta.page < currentMeta.totalPages) {
      void runSearch({ ...lastSearch, page: currentMeta.page + 1 });
    }
  });

  return {
    showAll() {
      input.value = '';
      categoryFilter.value = '';
      return runSearch({ query: '', categoryId: '', page: 1 });
    },
    /** HU-004 (D-25): repite los filtros y la página para reflejar la base de datos. */
    repeatLastSearch() {
      return lastSearch === null ? Promise.resolve() : runSearch(lastSearch);
    },
    /** HU-004: devuelve el foco al botón "Editar" de esa tarjeta, si sigue en la lista. */
    focusEditButton(bookId) {
      for (const button of resultsContainer.querySelectorAll('[data-book-id]')) {
        if (button.dataset.bookId === String(bookId)) {
          button.focus();
          return;
        }
      }
    },
  };
}
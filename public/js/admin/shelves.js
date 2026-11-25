import { request, ApiError } from '../shared/api.js';
import { clearFieldError, clearMessage, createElement, setBusy, setFieldError, showMessage } from '../shared/utils.js';

const MAX_SHELF_LABEL_LENGTH = 30;

const HEADINGS = { unassigned: 'Libros sin estante', assigned: 'Libros con estante asignado' };
const EMPTY_TEXTS = { unassigned: 'No hay libros sin estante.', assigned: 'No hay libros con estante asignado.' };
const SUBMIT_TEXTS = { unassigned: 'Asignar estante', assigned: 'Cambiar estante' };
const LOAD_ERROR_TEXT = 'No se pudieron cargar los libros. Inténtelo de nuevo.';
const ASSIGN_ERROR_TEXT = 'No se pudo asignar el estante. Inténtelo de nuevo.';

function countText(status, total) {
  if (status === 'unassigned') return total === 1 ? '1 libro sin estante.' : `${total} libros sin estante.`;
  return total === 1 ? '1 libro con estante asignado.' : `${total} libros con estante asignado.`;
}

// Same messages as the backend, which is always the authority (SPEC-002 §6.2).
function validateShelfLabel(label) {
  if (label === '') return 'El estante es obligatorio.';
  if (Array.from(label).length > MAX_SHELF_LABEL_LENGTH) {
    return `El estante no puede superar ${MAX_SHELF_LABEL_LENGTH} caracteres.`;
  }
  return null;
}

// HU-003: section "Asignar estantes" (SPEC-002 §7.2).
export function initializeShelfAssignments() {
  const section = document.getElementById('seccion-asignar');
  if (!section) return { show() {}, closeMenu() {} };

  const heading = document.getElementById('titulo-asignar');
  const menuButton = document.getElementById('shelf-menu-button');
  const menuPanel = document.getElementById('shelf-menu-panel');
  const showAssignedButton = document.getElementById('shelf-show-assigned');
  const messages = document.getElementById('shelf-messages');
  const summary = document.getElementById('shelf-summary');
  const listContainer = document.getElementById('shelf-list');
  const menu = menuButton.parentElement;

  let currentStatus = 'unassigned';
  let books = [];
  let loadToken = 0; // a response from an older load never overwrites a newer one

  // --- Options menu ("⋮") ---
  function setMenuOpen(open, { restoreFocus = false } = {}) {
    menuPanel.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => setMenuOpen(menuPanel.hidden));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menuPanel.hidden) setMenuOpen(false, { restoreFocus: true });
  });
  document.addEventListener('click', (event) => {
    if (!menuPanel.hidden && !menu.contains(event.target)) setMenuOpen(false);
  });

  // --- Summary and states ---
  function renderState(text, modifier) {
    const className = modifier ? `state state-${modifier}` : 'state';
    summary.replaceChildren(createElement('p', { className, text }));
  }

  function refreshSummary() {
    if (books.length === 0) {
      listContainer.replaceChildren();
      renderState(EMPTY_TEXTS[currentStatus]);
    } else {
      summary.replaceChildren(createElement('p', { className: 'results-summary', text: countText(currentStatus, books.length) }));
    }
  }

  // --- List item: card with its own form ---
  function createItem(book) {
    const titleId = `shelf-title-${book.id}`;
    const inputId = `shelf-input-${book.id}`;
    const errorId = `shelf-error-${book.id}`;

    const item = createElement('li', { className: 'assignment-item' });
    const quantityLine = createElement('p', { className: 'assignment-meta', text: `Cantidad: ${book.quantity}` });
    if (book.quantity === 0) {
      quantityLine.append(' ', createElement('span', { className: 'badge-out-of-stock', text: 'agotado' }));
    }
    item.append(
      createElement('h3', { className: 'assignment-title', text: book.title, attributes: { id: titleId } }),
      createElement('p', { className: 'assignment-meta', text: `Autor: ${book.author}` }),
      quantityLine,
    );
    let shelfLine = null;
    if (currentStatus === 'assigned') {
      shelfLine = createElement('p', { className: 'assignment-meta', text: `Estante: ${book.shelfLabel}` });
      item.append(shelfLine);
    }

    const input = createElement('input', {
      attributes: { id: inputId, name: 'shelfLabel', type: 'text', maxlength: String(MAX_SHELF_LABEL_LENGTH), autocomplete: 'off', 'aria-describedby': titleId },
    });
    const errorBox = createElement('p', { className: 'field-error', attributes: { id: errorId, hidden: '' } });
    const field = createElement('div', { className: 'field' });
    field.append(createElement('label', { text: 'Estante', attributes: { for: inputId } }), input, errorBox);
    const submit = createElement('button', { className: 'btn btn-primary', text: SUBMIT_TEXTS[currentStatus], attributes: { type: 'submit' } });
    const form = createElement('form', { className: 'assignment-form', attributes: { novalidate: '' } });
    form.append(field, submit);
    item.append(form);

    function showFieldProblem(text) {
      setFieldError(input, errorBox, text);
      input.setAttribute('aria-describedby', `${titleId} ${errorId}`);
      input.focus();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      clearMessage(messages);
      clearFieldError(input, errorBox);
      input.setAttribute('aria-describedby', titleId);

      const label = input.value.trim();
      const problem = validateShelfLabel(label);
      if (problem) {
        showFieldProblem(problem);
        return;
      }

      const token = loadToken;
      setBusy(submit, true);
      try {
        const updated = await request(`/api/books/${book.id}/shelf`, { method: 'PUT', body: { shelfLabel: label } });
        if (token !== loadToken) return; // the list was reloaded meanwhile and already shows the truth
        if (currentStatus === 'unassigned') {
          books = books.filter((candidate) => candidate.id !== book.id);
          item.remove();
          showMessage(messages, `Estante «${updated.shelfLabel}» asignado a «${updated.title}».`, 'success');
          refreshSummary();
          heading.focus();
        } else {
          book.shelfLabel = updated.shelfLabel;
          shelfLine.textContent = `Estante: ${updated.shelfLabel}`;
          input.value = '';
          showMessage(messages, `Estante de «${updated.title}» cambiado a «${updated.shelfLabel}».`, 'success');
          input.focus();
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return;
        if (error instanceof ApiError && error.status === 400) {
          showFieldProblem(error.fields?.shelfLabel ?? error.message);
        } else if (error instanceof ApiError && error.status === 404) {
          showMessage(messages, 'El libro no existe.');
          load(currentStatus);
        } else {
          showMessage(messages, ASSIGN_ERROR_TEXT);
        }
      } finally {
        if (item.isConnected) setBusy(submit, false);
      }
    });

    return item;
  }

  function renderList() {
    if (books.length === 0) {
      refreshSummary();
      return;
    }
    const list = createElement('ul', { className: 'assignment-list' });
    for (const book of books) list.append(createItem(book));
    listContainer.replaceChildren(list);
    refreshSummary();
  }

  // Reloads the list from the server. It does not touch the message area, so a
  // confirmation or an error shown just before a reload stays visible.
  async function load(status) {
    currentStatus = status;
    const token = ++loadToken;
    heading.textContent = HEADINGS[status];
    books = [];
    listContainer.replaceChildren();
    renderState('Cargando…', 'loading');
    try {
      const data = (await request(`/api/shelf-assignments?status=${status}`)) ?? [];
      if (token !== loadToken) return;
      books = data;
      renderList();
    } catch (error) {
      if (token !== loadToken) return;
      if (error instanceof ApiError && error.status === 401) return;
      renderState(LOAD_ERROR_TEXT, 'error');
    }
  }

  showAssignedButton.addEventListener('click', () => {
    setMenuOpen(false);
    clearMessage(messages);
    heading.focus();
    load('assigned');
  });

  return {
    /** Called every time "Asignar estantes" is pressed: shows the list without shelf, reloaded. */
    show() {
      setMenuOpen(false);
      clearMessage(messages);
      load('unassigned');
    },
    closeMenu() {
      setMenuOpen(false);
    },
  };
}
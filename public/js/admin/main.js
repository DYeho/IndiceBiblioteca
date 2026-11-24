import { request, ApiError } from '../shared/api.js';
import { createElement, setBusy, showMessage } from '../shared/utils.js';
import { initializeBookRegistration, initializeBookSearch } from './books.js';
import { initializeBookEdit } from './book-edit.js';
import { initializeShelfAssignments } from './shelves.js';

const sectionButtons = document.querySelectorAll('[data-section]');
const logoutButton = document.getElementById('logout');

// Container for status messages (aria-live). Created when the page does not have one,
// so an error is never silent.
function getMessagesContainer() {
  let container = document.getElementById('mensajes');
  if (!container) {
    container = createElement('div', { attributes: { id: 'mensajes', 'aria-live': 'polite' } });
    (document.getElementById('contenido') ?? document.body).prepend(container);
  }
  return container;
}

// Logout is registered first so it works even if the rest of the page fails.
// 204 (or 401) takes the person to /login.html (SPEC-001 §7.2).
logoutButton?.addEventListener('click', async () => {
  setBusy(logoutButton, true);
  try {
    await request('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login.html');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.assign('/login.html');
      return;
    }
    showMessage(getMessagesContainer(), 'No se pudo cerrar la sesión. Inténtelo de nuevo.');
    setBusy(logoutButton, false);
  }
});

// Four sections, one visible at a time (D-23). "Buscar libros" is shown on load.
// "Editar libro" has no header button: while it is visible, its origin ("Buscar libros") is marked.
const SECTION_NAMES = ['buscar', 'registrar', 'asignar', 'editar'];
const shelves = initializeShelfAssignments();
// Sections that reload their content every time their button is pressed.
const onButtonPress = { asignar: () => shelves.show() };

function showSection(name) {
  const markedButton = name === 'editar' ? 'buscar' : name;
  for (const sectionName of SECTION_NAMES) {
    const section = document.getElementById(`seccion-${sectionName}`);
    if (section) section.hidden = sectionName !== name;
  }
  for (const button of sectionButtons) {
    if (button.dataset.section === markedButton) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (name !== 'asignar') shelves.closeMenu();
}

for (const button of sectionButtons) {
  button.addEventListener('click', () => {
    showSection(button.dataset.section);
    onButtonPress[button.dataset.section]?.();
  });
}
showSection('buscar');
// HU-004: «Editar» en una tarjeta abre la sección «Editar libro» (D-23).
const edit = initializeBookEdit({
  showSection,
  messages: getMessagesContainer(),
  repeatSearch: () => search.repeatLastSearch(),
  focusEditButton: (bookId) => search.focusEditButton(bookId),
});
const search = initializeBookSearch({ onEdit: (book) => edit.open(book.id) });
initializeBookRegistration();
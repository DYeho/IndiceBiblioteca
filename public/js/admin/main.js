import { request, ApiError } from '../shared/api.js';
import { createElement, setBusy, showMessage } from '../shared/utils.js';
import { initializeBookRegistration, initializeBookSearch } from './books.js';

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

// Only one section is visible at a time (D-09). "Buscar libros" is shown on load.
function showSection(name) {
  for (const button of sectionButtons) {
    const active = button.dataset.section === name;
    const section = document.getElementById(`seccion-${button.dataset.section}`);
    if (section) section.hidden = !active;
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
}

for (const button of sectionButtons) {
  button.addEventListener('click', () => showSection(button.dataset.section));
}
showSection('buscar');
initializeBookSearch();
initializeBookRegistration();

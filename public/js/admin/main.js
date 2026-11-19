import { apiRequest, enableUnauthorizedRedirect } from '../shared/api.js';
import { initAdminBooks } from './books.js';

enableUnauthorizedRedirect();

const logoutButton = document.getElementById('logout-button');
const messageBox = document.getElementById('admin-message');

function showAdminMessage(text) {
  messageBox.textContent = text;
  messageBox.hidden = text === '';
}

logoutButton.addEventListener('click', async () => {
  showAdminMessage('');
  logoutButton.disabled = true;
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login.html');
  } catch (error) {
    showAdminMessage(error.message || 'No se pudo cerrar la sesión.');
    logoutButton.disabled = false;
  }
});

initAdminBooks();
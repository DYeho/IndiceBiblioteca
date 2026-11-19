import { apiRequest } from '../shared/api.js';

const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const usernameError = document.getElementById('username-error');
const passwordError = document.getElementById('password-error');
const messageBox = document.getElementById('login-message');
const submitButton = document.getElementById('login-submit');

function showFieldError(input, errorElement, text) {
  errorElement.textContent = text;
  errorElement.hidden = text === '';
  if (text === '') {
    input.removeAttribute('aria-invalid');
  } else {
    input.setAttribute('aria-invalid', 'true');
  }
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.hidden = text === '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  showFieldError(usernameInput, usernameError, username === '' ? 'El nombre de usuario es obligatorio.' : '');
  showFieldError(passwordInput, passwordError, password === '' ? 'La contraseña es obligatoria.' : '');
  if (username === '' || password === '') {
    (username === '' ? usernameInput : passwordInput).focus();
    return;
  }

  submitButton.disabled = true; // evita el doble envío
  try {
    await apiRequest('/api/auth/login', { method: 'POST', body: { username, password } });
    window.location.assign('/admin/');
  } catch (error) {
    if (error.status === 401) {
      showMessage('Usuario o contraseña incorrectos.');
      passwordInput.value = '';
      usernameInput.focus();
    } else if (error.status === 429) {
      showMessage('Demasiados intentos. Inténtelo de nuevo más tarde.');
    } else {
      showMessage('No se pudo conectar con el servidor. Inténtelo de nuevo.');
    }
  } finally {
    submitButton.disabled = false;
  }
});
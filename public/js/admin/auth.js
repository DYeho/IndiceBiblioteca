import { request, ApiError } from '../shared/api.js';
import { clearFieldError, clearMessage, setBusy, setFieldError, showMessage } from '../shared/utils.js';

const form = document.getElementById('login-form');
const messages = document.getElementById('mensajes');
const submit = document.getElementById('submit');
const fields = {
  username: { input: document.getElementById('username'), error: document.getElementById('username-error') },
  password: { input: document.getElementById('password'), error: document.getElementById('password-error') },
};

const REQUIRED = {
  username: 'El nombre de usuario es obligatorio.',
  password: 'La contraseña es obligatoria.',
};

function clearErrors() {
  clearMessage(messages);
  for (const { input, error } of Object.values(fields)) clearFieldError(input, error);
}

// Returns the first field with an error, or null when the form can be sent.
function validate() {
  let firstInvalid = null;
  if (fields.username.input.value.trim() === '') {
    setFieldError(fields.username.input, fields.username.error, REQUIRED.username);
    firstInvalid ??= fields.username.input;
  }
  if (fields.password.input.value === '') {
    setFieldError(fields.password.input, fields.password.error, REQUIRED.password);
    firstInvalid ??= fields.password.input;
  }
  return firstInvalid;
}

function showApiFailure(error) {
  if (error.status === 401) {
    showMessage(messages, 'Usuario o contraseña incorrectos.');
    fields.password.input.value = '';
    fields.username.input.focus();
  } else if (error.status === 429) {
    showMessage(messages, 'Demasiados intentos. Inténtelo de nuevo más tarde.');
  } else if (error.status === 400 && Object.keys(error.fields).length > 0) {
    let firstInvalid = null;
    for (const [name, text] of Object.entries(error.fields)) {
      if (fields[name]) {
        setFieldError(fields[name].input, fields[name].error, text);
        firstInvalid ??= fields[name].input;
      }
    }
    firstInvalid?.focus();
  } else {
    showMessage(messages, 'No se pudo conectar con el servidor. Inténtelo de nuevo.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const firstInvalid = validate();
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  setBusy(submit, true);
  try {
    await request('/api/auth/login', {
      method: 'POST',
      body: { username: fields.username.input.value, password: fields.password.input.value },
    });
    window.location.assign('/admin/');
  } catch (error) {
    if (error instanceof ApiError) showApiFailure(error);
    else showMessage(messages, 'No se pudo conectar con el servidor. Inténtelo de nuevo.');
    setBusy(submit, false);
  }
});
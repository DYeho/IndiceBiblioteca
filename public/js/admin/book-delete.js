import { request, ApiError } from '../shared/api.js';
import { clearMessage, setBusy, showMessage } from '../shared/utils.js';

const NOT_FOUND_TEXT = 'El libro no existe. Puede que ya haya sido eliminado.';
const DELETE_ERROR_TEXT = 'No se pudo eliminar el libro. Inténtelo de nuevo.';

function copiesText(quantity) {
  return quantity === 1 ? 'Se dejará de registrar 1 ejemplar.' : `Se dejarán de registrar ${quantity} ejemplares.`;
}

// HU-005: diálogo de confirmación y eliminación (SPEC-002 §7.5, D-24).
// La confirmación es solo de interfaz: el backend no exige ningún token.
export function initializeBookDelete({ messages, repeatSearch }) {
  const dialog = document.getElementById('delete-dialog');
  if (!dialog) return { open() {} };

  const titleLine = document.getElementById('delete-title');
  const authorLine = document.getElementById('delete-author');
  const quantityLine = document.getElementById('delete-quantity');
  const copiesLine = document.getElementById('delete-copies');
  const dialogMessages = document.getElementById('delete-messages');
  const cancel = document.getElementById('delete-cancel');
  const confirm = document.getElementById('delete-confirm');

  let currentBook = null;
  let originButton = null;
  let busy = false;

  function closeAndReturnFocus() {
    if (dialog.open) dialog.close();
    originButton?.focus();
  }

  // Los datos son los de la tarjeta desde la que se abrió el diálogo.
  function open(book, button) {
    currentBook = book;
    originButton = button ?? null;
    busy = false;
    clearMessage(dialogMessages);
    titleLine.textContent = book.title;
    authorLine.textContent = `Autor: ${book.author}`;
    quantityLine.textContent = `Cantidad: ${book.quantity}`;
    copiesLine.textContent = book.quantity >= 1 ? copiesText(book.quantity) : '';
    copiesLine.hidden = book.quantity < 1;
    setBusy(confirm, false);
    setBusy(cancel, false);
    dialog.showModal();
    cancel.focus(); // el foco inicial es «Cancelar»
  }

  // Cancelar con el botón: no se envía nada.
  cancel.addEventListener('click', () => {
    if (busy) return;
    currentBook = null;
    closeAndReturnFocus();
  });

  // Escape: no se envía nada. Mientras se espera la respuesta no se puede cerrar.
  dialog.addEventListener('cancel', (event) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    currentBook = null;
    originButton?.focus();
  });

  confirm.addEventListener('click', async () => {
    if (busy || currentBook === null) return;
    const book = currentBook;
    busy = true;
    clearMessage(dialogMessages);
    setBusy(confirm, true);
    setBusy(cancel, true);

    try {
      await request(`/api/books/${book.id}`, { method: 'DELETE' });
      currentBook = null;
      busy = false;
      if (dialog.open) dialog.close();
      showMessage(messages, `Libro eliminado: «${book.title}» de ${book.author}.`, 'success');
      repeatSearch(); // D-25: la lista refleja la base de datos
      messages.focus();
    } catch (error) {
      busy = false;
      if (error instanceof ApiError && error.status === 401) return; // api.js redirige a /login.html
      if (error instanceof ApiError && error.status === 404) {
        currentBook = null;
        if (dialog.open) dialog.close();
        showMessage(messages, NOT_FOUND_TEXT, 'error');
        repeatSearch();
        messages.focus();
        return;
      }
      // Otro error: el diálogo sigue abierto para poder reintentar o cancelar.
      showMessage(dialogMessages, DELETE_ERROR_TEXT);
      setBusy(confirm, false);
      setBusy(cancel, false);
      cancel.focus();
    }
  });

  return { open };
}
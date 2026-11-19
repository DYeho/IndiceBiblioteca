import { apiRequest } from '../shared/api.js';
import { clearElement, renderState, renderSummary } from '../shared/utils.js';
import { createPublicBooksView } from './books.js';

const MAX_SEARCH_LENGTH = 200;

export function initPublicSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const errorBox = document.getElementById('search-error');
  const submitButton = document.getElementById('search-submit');
  const summaryContainer = document.getElementById('search-summary');
  const resultsContainer = document.getElementById('results-container');
  const detailRegion = document.getElementById('detail-region');

  const booksView = createPublicBooksView({ resultsContainer, detailRegion });

  function showInputError(text) {
    errorBox.textContent = text;
    errorBox.hidden = text === '';
    if (text === '') {
      input.removeAttribute('aria-invalid');
    } else {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  renderState(resultsContainer, 'Escribe un título o autor para buscar en el catálogo.');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = input.value.trim();

    if (query === '') {
      showInputError('Escriba un título o autor para buscar.');
      input.focus();
      return;
    }
    if ([...query].length > MAX_SEARCH_LENGTH) {
      showInputError(`El texto de búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`);
      input.focus();
      return;
    }

    showInputError('');
    booksView.closeDetail();
    clearElement(summaryContainer);
    renderState(resultsContainer, 'Buscando libros...', 'loading');
    submitButton.disabled = true;

    try {
      const payload = await apiRequest('/api/books', { query: { q: query } });
      const books = payload?.data ?? [];
      const total = payload?.meta?.total ?? books.length;

      renderSummary(summaryContainer, total === 1 ? '1 resultado' : `${total} resultados`);
      if (books.length === 0) {
        renderState(resultsContainer, 'No se encontraron libros que coincidan con tu búsqueda.');
      } else {
        booksView.renderBooks(books);
      }
    } catch (error) {
      clearElement(summaryContainer);
      if (error.status === 400) {
        showInputError(error.fields?.q ?? error.message);
        renderState(resultsContainer, 'Escribe un título o autor para buscar en el catálogo.');
        input.focus();
      } else if (error.status === 429) {
        renderState(resultsContainer, 'Demasiadas solicitudes. Inténtelo de nuevo más tarde.', 'error');
      } else {
        renderState(resultsContainer, error.message || 'No se pudo conectar con el servidor.', 'error');
      }
    } finally {
      submitButton.disabled = false;
    }
  });
}
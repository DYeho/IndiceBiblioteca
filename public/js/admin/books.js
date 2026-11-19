import { apiRequest } from '../shared/api.js';
import { clearElement, createElement, renderState, renderSummary } from '../shared/utils.js';

const MAX_SEARCH_LENGTH = 200;

export function initAdminBooks() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const errorBox = document.getElementById('search-error');
  const submitButton = document.getElementById('search-submit');
  const summaryContainer = document.getElementById('search-summary');
  const resultsContainer = document.getElementById('results-container');
  const detailRegion = document.getElementById('detail-region');

  let activeCard = null;

  function showInputError(text) {
    errorBox.textContent = text;
    errorBox.hidden = text === '';
    if (text === '') {
      input.removeAttribute('aria-invalid');
    } else {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  function closeDetail() {
    if (activeCard) {
      activeCard.removeAttribute('aria-current');
      activeCard = null;
    }
    clearElement(detailRegion);
    detailRegion.hidden = true;
  }

  function openBookPreview(book, card) {
    if (activeCard) {
      activeCard.removeAttribute('aria-current');
    }
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
    closeButton.addEventListener('click', closeDetail);
    header.append(closeButton);

    const list = createElement('dl', { className: 'detail-list' });
    list.append(
      createElement('div'),
    );
    const authorRow = list.firstElementChild;
    authorRow.append(
      createElement('dt', { className: 'detail-term', text: 'Autor' }),
      createElement('dd', { className: 'detail-value', text: book.author }),
    );

    const shelfRow = document.createElement('div');
    shelfRow.append(
      createElement('dt', { className: 'detail-term', text: 'Estante' }),
      createElement('dd', {
        className: book.shelfLabel ? 'detail-value detail-shelf' : 'detail-value',
        text: book.shelfLabel ?? 'Sin estante asignado',
      }),
    );

    const qtyRow = document.createElement('div');
    qtyRow.append(
      createElement('dt', { className: 'detail-term', text: 'Ejemplares' }),
      createElement('dd', { className: 'detail-value', text: String(book.quantity) }),
    );

    list.append(shelfRow, qtyRow);
    panel.append(header, list);
    detailRegion.replaceChildren(panel);
    detailRegion.hidden = false;
  }

  function renderResults(books) {
    closeDetail();
    const grid = createElement('ul', { className: 'results-grid' });

    for (const book of books) {
      const li = document.createElement('li');
      const card = createElement('button', {
        className: 'book-card',
        attributes: { type: 'button' },
      });
      card.append(createElement('span', { className: 'book-card-title', text: book.title }));
      card.append(createElement('span', { className: 'book-card-author', text: book.author }));
      card.append(
        createElement('span', {
          className: book.shelfLabel ? 'book-card-shelf' : 'book-card-author',
          text: book.shelfLabel ? `Estante ${book.shelfLabel}` : 'Sin estante asignado',
        }),
      );
      if (book.quantity === 0) {
        card.append(createElement('span', { className: 'badge-out-of-stock', text: 'Agotado' }));
      }
      card.addEventListener('click', () => openBookPreview(book, card));
      li.append(card);
      grid.append(li);
    }

    resultsContainer.replaceChildren(grid);
  }

  renderState(resultsContainer, 'Busca un libro por título o autor para consultarlo.');

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
    closeDetail();
    clearElement(summaryContainer);
    renderState(resultsContainer, 'Buscando libros...', 'loading');
    submitButton.disabled = true;

    try {
      const payload = await apiRequest('/api/books', { query: { q: query } });
      const books = payload?.data ?? [];
      const total = payload?.meta?.total ?? books.length;

      renderSummary(summaryContainer, total === 1 ? '1 resultado' : `${total} resultados`);
      if (books.length === 0) {
        renderState(resultsContainer, 'No se encontraron libros que coincidan con la búsqueda.');
      } else {
        renderResults(books);
      }
    } catch (error) {
      clearElement(summaryContainer);
      renderState(resultsContainer, error.message || 'No se pudo conectar con el servidor.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}
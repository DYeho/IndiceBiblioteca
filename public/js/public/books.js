import { createElement } from '../shared/utils.js';

function createDetailRow(termText, valueNode) {
  const wrapper = document.createElement('div');
  wrapper.append(createElement('dt', { className: 'detail-term', text: termText }));
  wrapper.append(valueNode);
  return wrapper;
}

function formatAvailability(quantity) {
  if (quantity === 0) {
    const dd = createElement('dd', { className: 'detail-value' });
    dd.append(createElement('span', { className: 'badge-out-of-stock', text: 'Agotado (0 disponibles)' }));
    return dd;
  }
  const text = quantity === 1 ? '1 disponible' : `${quantity} disponibles`;
  return createElement('dd', { className: 'detail-value', text });
}

export function createPublicBooksView({ resultsContainer, detailRegion }) {
  let activeCard = null;

  function closeDetail({ restoreFocus = false } = {}) {
    const cardToFocus = activeCard;
    if (activeCard) {
      activeCard.removeAttribute('aria-current');
      activeCard = null;
    }
    detailRegion.replaceChildren();
    detailRegion.hidden = true;
    if (restoreFocus && cardToFocus) {
      cardToFocus.focus();
    }
  }

  function openDetail(book, cardButton) {
    if (activeCard) {
      activeCard.removeAttribute('aria-current');
    }
    activeCard = cardButton;
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
    );

    const shelfValue = book.shelfLabel
      ? createElement('dd', { className: 'detail-value detail-shelf', text: book.shelfLabel })
      : createElement('dd', { className: 'detail-value', text: 'Sin estante asignado' });
    list.append(createDetailRow('Estante', shelfValue));
    list.append(createDetailRow('Ejemplares', formatAvailability(book.quantity)));

    panel.append(header, list);
    detailRegion.replaceChildren(panel);
    detailRegion.hidden = false;
  }

  detailRegion.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetail({ restoreFocus: true });
    }
  });

  function renderBooks(books) {
    closeDetail();
    const grid = createElement('ul', { className: 'results-grid' });

    for (const book of books) {
      const item = document.createElement('li');
      const card = createElement('button', {
        className: 'book-card',
        attributes: { type: 'button' },
      });

      card.append(createElement('span', { className: 'book-card-title', text: book.title }));
      card.append(createElement('span', { className: 'book-card-author', text: book.author }));
      card.append(createElement('span', { className: 'book-card-category', text: `Categoría: ${book.category}` }));

      if (book.shelfLabel) {
        card.append(createElement('span', { className: 'book-card-shelf', text: `Estante ${book.shelfLabel}` }));
      } else {
        card.append(createElement('span', { className: 'book-card-author', text: 'Sin estante asignado' }));
      }

      if (book.quantity === 0) {
        card.append(createElement('span', { className: 'badge-out-of-stock', text: 'Agotado' }));
      }

      card.addEventListener('click', () => openDetail(book, card));
      item.append(card);
      grid.append(item);
    }

    resultsContainer.replaceChildren(grid);
  }

  return { renderBooks, closeDetail };
}
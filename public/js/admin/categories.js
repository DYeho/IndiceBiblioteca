import { ApiError, request } from '../shared/api.js';
import { setBusy } from '../shared/utils.js';

const MAX_CATEGORY_LENGTH = 60;
let categories = null;
let categoriesRequest = null;
const categorySelects = new Map();

function renderSelect(select, selectedId = select.value) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona una categoría';
  const options = [placeholder];

  for (const category of categories ?? []) {
    const option = document.createElement('option');
    option.value = String(category.id);
    option.textContent = category.name;
    options.push(option);
  }

  select.replaceChildren(...options);
  select.value = selectedId;
}

async function loadCategories() {
  if (!categoriesRequest) {
    categoriesRequest = request('/api/categories')
      .then(result => {
        categories = result;
        return categories;
      })
      .catch(error => {
        categoriesRequest = null;
        throw error;
      });
  }
  return categoriesRequest;
}

function renderAllSelects() {
  for (const [select, getSelectedId] of categorySelects) {
    renderSelect(select, getSelectedId());
  }
}

export function initializeCategoryPicker(prefix) {
  const select = document.getElementById(`${prefix}-category`);
  if (!select) return { setSelected() {} };

  const toggle = document.getElementById(`${prefix}-category-add-toggle`);
  const panel = document.getElementById(`${prefix}-category-add`);
  const nameInput = document.getElementById(`${prefix}-category-new-name`);
  const createButton = document.getElementById(`${prefix}-category-create`);
  const message = document.getElementById(`${prefix}-category-add-message`);
  let selectedId = '';

  categorySelects.set(select, () => selectedId);
  select.addEventListener('change', () => {
    selectedId = select.value;
    select.removeAttribute('aria-invalid');
  });

  void loadCategories()
    .then(() => renderSelect(select, selectedId))
    .catch(() => {
      message.textContent = 'No se pudieron cargar las categorías. Recargue la página e inténtelo de nuevo.';
    });

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    message.textContent = '';
    if (!panel.hidden) nameInput.focus();
  });

  createButton.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const length = Array.from(name).length;
    message.textContent = '';
    nameInput.removeAttribute('aria-invalid');

    if (!name || !name.normalize('NFD').replace(/\p{M}/gu, '')) {
      nameInput.setAttribute('aria-invalid', 'true');
      message.textContent = 'El nombre de la categoría es obligatorio.';
      nameInput.focus();
      return;
    }
    if (length > MAX_CATEGORY_LENGTH) {
      nameInput.setAttribute('aria-invalid', 'true');
      message.textContent = `La categoría no puede superar ${MAX_CATEGORY_LENGTH} caracteres.`;
      nameInput.focus();
      return;
    }

    setBusy(createButton, true);
    try {
      await loadCategories();
      const category = await request('/api/categories', { method: 'POST', body: { name } });
      categories = [...(categories ?? []), category];
      categoriesRequest = Promise.resolve(categories);
      selectedId = String(category.id);
      renderAllSelects();
      panel.hidden = true;
      nameInput.value = '';
      message.textContent = `Categoría «${category.name}» agregada y seleccionada.`;
      select.focus();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      if (error instanceof ApiError && error.status === 409) {
        message.textContent = 'Esa categoría ya existe. Selecciónela en la lista.';
        categoriesRequest = null;
        try {
          categories = await loadCategories();
          renderAllSelects();
        } catch {
          message.textContent = 'Esa categoría ya existe, pero no se pudo actualizar la lista. Recargue la página.';
        }
      } else if (error instanceof ApiError && error.status === 400) {
        nameInput.setAttribute('aria-invalid', 'true');
        message.textContent = error.fields?.name ?? error.message;
      } else {
        message.textContent = 'No se pudo agregar la categoría. Inténtelo de nuevo.';
      }
    } finally {
      setBusy(createButton, false);
    }
  });

  return {
    setSelected(id) {
      selectedId = String(id ?? '');
      renderSelect(select, selectedId);
    },
  };
}

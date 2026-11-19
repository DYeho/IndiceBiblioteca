// Utilidades de interfaz sin acceso a la API (SPEC-000 §9.5).
// Los textos de la API se asignan siempre con textContent (nunca como HTML).

/** Crea un elemento. `text` se inserta como texto seguro. */
export function createElement(tag, { className, text, attributes } = {}) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  for (const [name, value] of Object.entries(attributes ?? {})) {
    element.setAttribute(name, value);
  }
  return element;
}

/** Vacía un contenedor. */
export function clearElement(element) {
  element.replaceChildren();
}

/**
 * Muestra un estado en un contenedor (se reemplaza lo anterior).
 * variant: 'empty' (por defecto), 'loading' o 'error'.
 */
export function renderState(container, text, variant = 'empty') {
  const className = variant === 'empty' ? 'state' : `state state-${variant}`;
  container.replaceChildren(createElement('p', { className, text }));
}

/** Muestra el resumen de resultados (por ejemplo, "3 libros encontrados."). */
export function renderSummary(container, text) {
  container.replaceChildren(createElement('p', { className: 'results-summary', text }));
}
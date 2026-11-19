/** UI helpers without API access. API text is always inserted with textContent, never innerHTML. */

export function createElement(tag, { text, className, attributes = {} } = {}) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

export function showMessage(container, text, kind = 'error') {
  container.replaceChildren(createElement('div', { text, className: `alert alert-${kind}` }));
}

export function clearMessage(container) {
  container.replaceChildren();
}

export function setFieldError(input, errorElement, text) {
  errorElement.textContent = text;
  errorElement.hidden = false;
  input.setAttribute('aria-invalid', 'true');
}

export function clearFieldError(input, errorElement) {
  errorElement.textContent = '';
  errorElement.hidden = true;
  input.removeAttribute('aria-invalid');
}

export function setBusy(button, busy) {
  button.disabled = busy;
  if (busy) button.setAttribute('aria-busy', 'true');
  else button.removeAttribute('aria-busy');
}
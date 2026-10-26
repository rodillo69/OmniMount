/* OmniMount - utilidades de DOM.
   Hiperscript mínimo: evita un empaquetador y mantiene las vistas legibles. */
(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'readonly', 'required', 'selected', 'hidden']);

  /**
   * h('div.card', {onclick: fn}, [children])
   * El selector acepta etiqueta, #id y .clases.
   */
  function h(selector, attrs, children) {
    if (Array.isArray(attrs) || typeof attrs === 'string' || attrs instanceof Node) {
      children = attrs;
      attrs = null;
    }

    const parsed = parseSelector(selector);
    const node = document.createElement(parsed.tag);
    if (parsed.id) node.id = parsed.id;
    if (parsed.classes.length) node.className = parsed.classes.join(' ');

    applyAttrs(node, attrs);
    append(node, children);
    return node;
  }

  function parseSelector(selector) {
    const tag = (selector.match(/^[a-zA-Z0-9-]+/) || ['div'])[0];
    const id = (selector.match(/#([\w-]+)/) || [])[1] || null;
    const classes = (selector.match(/\.[\w-]+/g) || []).map((c) => c.slice(1));
    return { tag, id, classes };
  }

  function applyAttrs(node, attrs) {
    if (!attrs) return;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === 'class' || key === 'className') {
        node.className = [node.className, value].filter(Boolean).join(' ');
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(node.style, value);
      } else if (key === 'dataset') {
        Object.assign(node.dataset, value);
      } else if (key === 'html') {
        // Only ever used with markup this app builds itself.
        node.innerHTML = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'value') {
        node.value = value;
      } else if (BOOLEAN_ATTRS.has(key)) {
        if (value === true) node.setAttribute(key, '');
        node[key] = Boolean(value);
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return;

    if (Array.isArray(children)) {
      for (const child of children) append(node, child);
      return;
    }
    if (children instanceof Node) {
      node.appendChild(children);
      return;
    }
    node.appendChild(document.createTextNode(String(children)));
  }

  /** Build an SVG icon from a path-only definition. */
  function svg(paths, size, extraClass) {
    const node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', '0 0 24 24');
    node.setAttribute('width', String(size || 20));
    node.setAttribute('height', String(size || 20));
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1.7');
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('aria-hidden', 'true');
    if (extraClass) node.setAttribute('class', extraClass);

    for (const definition of [].concat(paths)) {
      if (typeof definition === 'string') {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', definition);
        node.appendChild(path);
      } else {
        const shape = document.createElementNS(SVG_NS, definition.tag);
        for (const [key, value] of Object.entries(definition)) {
          if (key !== 'tag') shape.setAttribute(key, String(value));
        }
        node.appendChild(shape);
      }
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function mount(node, children) {
    clear(node);
    append(node, children);
    return node;
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  /** Field with a label, optional hint and inline error slot. */
  function field(label, control, options) {
    const opts = options || {};
    return h('label.field', [
      h('span.field__label', [
        label,
        opts.required ? h('span.field__req', '*') : null,
      ]),
      control,
      opts.hint ? h('span.field__hint', opts.hint) : null,
    ]);
  }

  function switchRow(label, checked, onChange, options) {
    const opts = options || {};
    const input = h('input.switch__input', {
      type: 'checkbox',
      checked: Boolean(checked),
      disabled: opts.disabled,
      onchange: (event) => onChange(event.target.checked),
    });
    return h('label.switch', [
      input,
      h('span.switch__track'),
      h('span.switch__text', [
        h('span.switch__label', label),
        opts.hint ? h('span.switch__hint', opts.hint) : null,
      ]),
    ]);
  }

  /** Mark a button busy while an async action runs, then restore it. */
  async function withBusy(button, action) {
    if (!button) return action();
    const wasDisabled = button.disabled;
    button.classList.add('is-busy');
    button.disabled = true;
    try {
      return await action();
    } finally {
      button.classList.remove('is-busy');
      button.disabled = wasDisabled;
    }
  }

  global.OM = global.OM || {};
  global.OM.dom = { h, svg, clear, mount, qs, qsa, field, switchRow, withBusy };
})(window);

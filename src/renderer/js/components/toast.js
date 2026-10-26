/* OmniMount - avisos efímeros. */
(function (global) {
  'use strict';

  const { h } = global.OM.dom;
  const { icon } = global.OM.icons;

  const ICONS = { ok: 'checkCircle', error: 'alert', warn: 'alert', info: 'info' };
  const DEFAULT_MS = { ok: 4000, info: 5000, warn: 7000, error: 9000 };

  let container = null;

  function host() {
    if (!container) {
      container = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(container);
    }
    return container;
  }

  function show(options) {
    const opts = typeof options === 'string' ? { message: options } : options || {};
    const kind = opts.kind || 'info';
    const node = h(`div.toast.toast--${kind}`, [
      icon(ICONS[kind] || 'info', 18, 'toast__icon'),
      h('div.toast__body', [
        opts.title ? h('div.toast__title', opts.title) : null,
        opts.message ? h('div.toast__msg.selectable', opts.message) : null,
      ]),
      h(
        'button.toast__close',
        { type: 'button', title: t('toast.cerrar'), onclick: () => dismiss(node) },
        icon('x', 14)
      ),
    ]);

    host().appendChild(node);

    // Errors stay until dismissed: they usually carry something to act on.
    const ttl = opts.sticky || kind === 'error' ? 0 : opts.duration || DEFAULT_MS[kind];
    if (ttl) setTimeout(() => dismiss(node), ttl);
    return node;
  }

  function dismiss(node) {
    if (!node || !node.parentNode) return;
    node.style.transition = 'opacity 140ms ease, transform 140ms ease';
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    setTimeout(() => node.remove(), 150);
  }

  global.OM.toast = {
    show,
    ok: (message, title) => show({ kind: 'ok', message, title }),
    info: (message, title) => show({ kind: 'info', message, title }),
    warn: (message, title) => show({ kind: 'warn', message, title }),
    error: (message, title) => show({ kind: 'error', message, title: title || 'No se pudo completar' }),
  };
})(window);

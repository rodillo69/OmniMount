/* OmniMount - modales. */
(function (global) {
  'use strict';

  const { h, clear } = global.OM.dom;

  let openCount = 0;

  /**
   * open({title, description, body, footer, wide, onClose})
   * Returns a handle with close() and the body node, so a caller can
   * re-render the contents without rebuilding the dialog.
   */
  function open(options) {
    const opts = options || {};

    const body = h('div.modal__body');
    if (opts.body) body.appendChild(opts.body);

    const footer = h('div.modal__foot' + (opts.splitFooter ? '.modal__foot--split' : ''));
    if (opts.footer) footer.appendChild(opts.footer);

    const dialog = h(`div.modal${opts.wide ? '.modal--wide' : ''}`, {
      role: 'dialog',
      'aria-modal': 'true',
      onclick: (event) => event.stopPropagation(),
    }, [
      h('div.modal__head', [
        h('h2.modal__title', opts.title || ''),
        opts.description ? h('p.modal__desc', opts.description) : null,
      ]),
      body,
      opts.footer ? footer : null,
    ]);

    const backdrop = h('div.modal-backdrop', {
      onclick: () => {
        if (opts.dismissable !== false) close();
      },
    }, dialog);

    function onKey(event) {
      if (event.key === 'Escape' && opts.dismissable !== false) {
        event.stopPropagation();
        close();
      }
    }

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      openCount = Math.max(0, openCount - 1);
      if (opts.onClose) opts.onClose();
    }

    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    openCount += 1;

    // Focus the first useful control so the dialog is keyboard-ready.
    requestAnimationFrame(() => {
      const target =
        dialog.querySelector('[data-autofocus]') ||
        dialog.querySelector('input:not([type=hidden]), select, textarea, button');
      if (target) target.focus();
    });

    return {
      close,
      body,
      footer,
      dialog,
      setBody: (content) => {
        clear(body);
        if (content) body.appendChild(content);
      },
      setFooter: (content) => {
        clear(footer);
        if (content) footer.appendChild(content);
      },
    };
  }

  /** A promise-based confirm rendered in our own style, not the OS dialog. */
  function confirm(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        handle.close();
        resolve(value);
      };

      const handle = open({
        title: opts.title || 'Confirmar',
        description: opts.description,
        body: h('div.stack', [
          opts.message ? h('p', opts.message) : null,
          opts.detail ? h('p.muted', { style: { fontSize: 'var(--fs-sm)' } }, opts.detail) : null,
        ]),
        footer: h('div.row', [
          h('button.btn.btn--ghost', { type: 'button', onclick: () => finish(false) },
            opts.cancelLabel || 'Cancelar'),
          h(
            `button.btn.${opts.danger ? 'btn--danger' : 'btn--primary'}`,
            { type: 'button', 'data-autofocus': '', onclick: () => finish(true) },
            opts.confirmLabel || 'Aceptar'
          ),
        ]),
        onClose: () => finish(false),
      });
    });
  }

  /** Single-field prompt, used for folder names and renames. */
  function prompt(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const input = h('input.input', {
        type: 'text',
        value: opts.value || '',
        placeholder: opts.placeholder || '',
        'data-autofocus': '',
        onkeydown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        },
      });
      const error = h('span.field__error', { style: { display: 'none' } });

      function finish(value) {
        if (settled) return;
        settled = true;
        handle.close();
        resolve(value);
      }

      function submit() {
        const value = input.value.trim();
        if (!value) {
          error.textContent = 'Escribe un valor.';
          error.style.display = 'flex';
          input.classList.add('is-invalid');
          return;
        }
        if (opts.validate) {
          const problem = opts.validate(value);
          if (problem) {
            error.textContent = problem;
            error.style.display = 'flex';
            input.classList.add('is-invalid');
            return;
          }
        }
        finish(value);
      }

      const handle = open({
        title: opts.title || 'Introduce un valor',
        description: opts.description,
        body: h('div.field', [
          opts.label ? h('span.field__label', opts.label) : null,
          input,
          opts.hint ? h('span.field__hint', opts.hint) : null,
          error,
        ]),
        footer: h('div.row', [
          h('button.btn.btn--ghost', { type: 'button', onclick: () => finish(null) }, 'Cancelar'),
          h('button.btn.btn--primary', { type: 'button', onclick: submit },
            opts.confirmLabel || 'Aceptar'),
        ]),
        onClose: () => finish(null),
      });

      requestAnimationFrame(() => input.select());
    });
  }

  global.OM.modal = { open, confirm, prompt, get openCount() { return openCount; } };
})(window);

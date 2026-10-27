/* OmniMount - pantalla de preparación.
   Se encarga sola de dejar el equipo listo en el primer arranque. */
(function (global) {
  'use strict';

  const { h, mount } = global.OM.dom;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;

  const STEPS = [
    // Keys: this runs at load, before the language is applied.
    { id: 'rclone', labelKey: 'setup.motorDeTransferencia' },
    { id: 'winfsp', labelKey: 'setup.controladorDeUnidad' },
  ];

  let overlay = null;
  let stepsNode = null;
  let messageNode = null;
  let barNode = null;
  let actionsNode = null;
  let state = { done: new Set(), current: null, percent: null, message: '', elevation: false };

  function build() {
    stepsNode = h('div.setup__steps');
    messageNode = h('div.setup__message');
    barNode = h('div.progress__bar', { style: { width: '0%' } });
    actionsNode = h('div.setup__actions');

    overlay = h('div.setup', [
      h('div.setup__panel', [
        h('div.setup__logo', global.OM.brand.lockup({ size: 26 })),
        h('div.setup__kicker', t('setup.preparandoOmnimount')),
        h('h1.setup__title', t('setup.unMomentoEstamosDejandolo')),
        h(
          'p.setup__text',
          t('setup.installingBody')
        ),
        stepsNode,
        h('div.progress.setup__progress', barNode),
        messageNode,
        actionsNode,
      ]),
    ]);

    document.body.appendChild(overlay);
    paint();
  }

  function paint() {
    if (!stepsNode) return;

    mount(
      stepsNode,
      STEPS.map((step) => {
        const done = state.done.has(step.id);
        const active = state.current === step.id;
        const cls = done ? 'is-done' : active ? 'is-active' : '';
        return h(`div.setup__step.${cls}`, [
          h(
            'div.setup__step-mark',
            done ? icon('check', 14) : active ? h('span.setup__spinner') : h('span.setup__pending')
          ),
          h('div.setup__step-label', t(step.labelKey)),
          done ? h('span.setup__step-state', t('setup.listo')) : null,
        ]);
      })
    );

    mount(messageNode, [
      state.message ? h('span', state.message) : null,
      state.elevation
        ? h('div.setup__elevation', [
            icon('shield', 15),
            h(
              'span',
              t('setup.uacNotice')
            ),
          ])
        : null,
    ]);

    const percent = state.percent;
    barNode.parentNode.classList.toggle('progress--indeterminate', percent === null);
    barNode.style.width = `${percent === null ? 36 : percent}%`;
  }

  /* ------------------------------------------------------------- público */

  function show() {
    if (!overlay) build();
    overlay.classList.remove('is-hiding');
    overlay.style.display = '';
  }

  function hide() {
    if (!overlay) return;
    overlay.classList.add('is-hiding');
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 320);
  }

  /** Recibe cada evento de progreso del proceso principal. */
  function onProgress(payload) {
    if (!payload) return;

    if (payload.id === 'all') {
      state.message = payload.message || '';
      state.percent = 100;
      paint();
      return;
    }

    if (payload.stage === 'done') {
      state.done.add(payload.id);
      state.current = null;
      state.elevation = false;
      state.percent = 100;
      state.message = payload.message || '';
    } else {
      state.current = payload.id;
      state.elevation = Boolean(payload.needsElevation);
      state.percent = typeof payload.percent === 'number' ? payload.percent : null;
      state.message =
        payload.message ||
        (payload.received && payload.total
          ? `${fmt.bytes(payload.received)} de ${fmt.bytes(payload.total)}`
          : '');
    }
    paint();
  }

  function succeed(text) {
    state.current = null;
    state.elevation = false;
    state.percent = 100;
    state.message = text || 'Todo listo.';
    for (const step of STEPS) state.done.add(step.id);
    mount(actionsNode, []);
    paint();
  }

  function fail(message, onRetry) {
    state.current = null;
    state.elevation = false;
    state.percent = 0;
    state.message = '';
    paint();

    mount(messageNode, [
      h('div.setup__error', [
        icon('alert', 16),
        h('span.selectable', message || t('setup.failed')),
      ]),
    ]);

    mount(actionsNode, [
      h('button.btn.btn--light.btn--lg', { type: 'button', onclick: onRetry }, [
        icon('refresh', 17, 'btn__icon'),
        h('span', t('setup.reintentar')),
      ]),
    ]);
  }

  function reset() {
    state = { done: new Set(), current: null, percent: null, message: '', elevation: false };
    if (actionsNode) mount(actionsNode, []);
    paint();
  }

  global.OM = global.OM || {};
  /**
   * Is the first-run screen covering the window?
   *
   * The update notice asks, because a dialog drawn underneath this overlay
   * is a dialog nobody can answer.
   */
  function isShowing() {
    return Boolean(overlay) && overlay.style.display !== 'none';
  }

  global.OM.setup = { show, hide, onProgress, succeed, fail, reset, isShowing };
})(window);

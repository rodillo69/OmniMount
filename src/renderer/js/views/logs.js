/* OmniMount - registro por unidad. */
(function (global) {
  'use strict';

  const { h, mount, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;
  const toast = global.OM.toast;

  const view = { mountId: null, filter: 'all', follow: true };
  let container = null;
  let linesNode = null;
  let entries = [];

  const FILTERS = [
    { key: 'all', label: t('logs.todo') },
    { key: 'problems', label: t('logs.avisosYErrores') },
    { key: 'system', label: t('logs.actividad') },
  ];

  function app() {
    return global.OM.app;
  }

  function render(params) {
    const mounts = app().state.mounts;
    if (!mounts.length) {
      return h('div.view__inner', [headerNode(mounts), emptyNode()]);
    }

    const requested = (params && params.mountId) || view.mountId;
    const target = mounts.find((m) => m.id === requested) || mounts[0];
    view.mountId = target.id;

    container = h('div.view__inner');
    linesNode = h('div.logbox__lines');

    mount(container, [
      headerNode(mounts),
      h('div.logbox', [barNode(), linesNode]),
    ]);

    loadLines();
    return container;
  }

  function headerNode(mounts) {
    const target = mounts.find((m) => m.id === view.mountId);

    return h('header.view__header', [
      h('div.view__heading', [
        h('div.kicker', t('logs.diagnostico')),
        h('h1.view__title', t('logs.registro')),
        h(
          'p.view__sub',
          'La salida de rclone para cada unidad. Es el primer sitio donde mirar cuando un montaje falla.'
        ),
      ]),
      mounts.length
        ? h('div.view__actions', [
            h(
              'select.select',
              {
                style: { minWidth: '240px' },
                onchange: (e) => {
                  view.mountId = e.target.value;
                  app().renderView();
                },
              },
              mounts.map((m) =>
                h(
                  'option',
                  { value: m.id, selected: target && m.id === target.id },
                  `${m.driveLetter}:  ${m.name}`
                )
              )
            ),
          ])
        : null,
    ]);
  }

  function emptyNode() {
    return h('div.card', [
      h('div.empty', [
        h('div.empty__art', icon('terminal', 34)),
        h('h2.empty__title', t('logs.nadaRegistradoTodavia')),
        h('p.empty__text', t('logs.cuandoCreesYMontes')),
      ]),
    ]);
  }

  function barNode() {
    const status = app().statusOf(view.mountId);

    return h('div.logbox__bar', [
      h(
        'div.segmented',
        FILTERS.map((f) =>
          h(
            `button.segmented__item${view.filter === f.key ? '.is-active' : ''}`,
            {
              type: 'button',
              onclick: () => {
                view.filter = f.key;
                app().renderView();
              },
            },
            f.label
          )
        )
      ),
      h('span.badge.' + badgeClass(status.state), status.state),
      h('div', { style: { flex: '1' } }),
      global.OM.dom.switchRow('Seguir al final', view.follow, (v) => {
        view.follow = v;
        if (v) scrollToEnd();
      }),
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': 'Copiar al portapapeles', onclick: copyAll },
        icon('copy', 15)
      ),
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': 'Guardar en un fichero', onclick: (e) => exportLog(e.currentTarget) },
        icon('download', 15)
      ),
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': 'Vaciar el registro', onclick: clearLog },
        icon('trash', 15)
      ),
    ]);
  }

  function badgeClass(state) {
    if (state === 'mounted') return 'badge--rosa';
    if (state === 'error') return 'badge--error';
    if (state === 'mounting' || state === 'unmounting') return 'badge--brand';
    return 'badge--neutral';
  }

  async function loadLines() {
    entries = (await app().call(app().api.mounts.logs(view.mountId), { silent: true })) || [];
    paintLines();
  }

  function visible() {
    if (view.filter === 'problems') {
      return entries.filter((e) => e.level === 'error' || e.level === 'warn');
    }
    if (view.filter === 'system') {
      return entries.filter((e) => e.level === 'system' || e.level === 'error' || e.level === 'warn');
    }
    return entries;
  }

  function paintLines() {
    if (!linesNode) return;
    const rows = visible();

    if (!rows.length) {
      mount(linesNode, [
        h('div.empty', { style: { padding: 'var(--sp-12) var(--sp-6)' } }, [
          h('div.empty__art', icon('terminal', 34)),
          h('h2.empty__title', t('logs.sinLineas')),
          h(
            'p.empty__text',
            view.filter === 'all'
              ? 'Esta unidad no ha registrado nada en esta sesión.'
              : 'No hay líneas que encajen con el filtro.'
          ),
        ]),
      ]);
      return;
    }

    mount(linesNode, rows.map(lineNode));
    if (view.follow) scrollToEnd();
  }

  function lineNode(entry) {
    return h(`div.logline.logline--${entry.level}`, [
      h('span.logline__time', fmt.timeOnly(entry.at)),
      h('span.logline__text', entry.line),
    ]);
  }

  function scrollToEnd() {
    if (linesNode) linesNode.scrollTop = linesNode.scrollHeight;
  }

  /* -------------------------------------------------------------- eventos */

  function onMountLog(payload) {
    if (!payload || payload.mountId !== view.mountId) return;

    if (payload.cleared) {
      entries = [];
      paintLines();
      return;
    }
    if (!payload.entry) return;

    entries.push(payload.entry);
    if (entries.length > 1500) entries.splice(0, entries.length - 1500);

    // Añade sólo la línea nueva en lugar de repintar todo el bloque.
    const matches =
      view.filter === 'all' ||
      (view.filter === 'problems' && ['error', 'warn'].includes(payload.entry.level)) ||
      (view.filter === 'system' && ['system', 'error', 'warn'].includes(payload.entry.level));

    if (matches && linesNode && !linesNode.querySelector('.empty')) {
      linesNode.appendChild(lineNode(payload.entry));
      if (view.follow) scrollToEnd();
    } else if (matches) {
      paintLines();
    }
  }

  function onMountState(status) {
    if (status.id === view.mountId) app().renderView();
  }

  /* ------------------------------------------------------------ acciones */

  async function copyAll() {
    const text = visible()
      .map((e) => `${e.at} [${e.level}] ${e.line}`)
      .join('\n');
    if (!text) {
      toast.info('No hay nada que copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.ok(`${visible().length} línea(s) copiadas.`);
    } catch {
      toast.error('El portapapeles no está disponible.');
    }
  }

  async function exportLog(button) {
    await withBusy(button, async () => {
      const result = await app().call(app().api.mounts.exportLog(view.mountId));
      if (result && result.saved) toast.ok(`Registro guardado en ${result.path}`);
    });
  }

  async function clearLog() {
    const done = await app().call(app().api.mounts.clearLogs(view.mountId));
    if (done) {
      entries = [];
      paintLines();
      toast.ok('Registro vaciado.');
    }
  }

  global.OM = global.OM || {};
  global.OM.views = global.OM.views || {};
  global.OM.views.logs = { render, onMountLog, onMountState };
})(window);

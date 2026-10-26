/* OmniMount - panel de unidades. */
(function (global) {
  'use strict';

  const { h, mount, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;
  const toast = global.OM.toast;
  const modal = global.OM.modal;

  // Cards are patched in place rather than re-rendered, so live numbers can
  // tick every two seconds without the list flickering or losing scroll.
  let cards = new Map();
  let listNode = null;
  let summaryNode = null;
  let container = null;

  const STATE_TEXT = {
    mounted: 'Montada',
    mounting: 'Montando',
    unmounting: 'Desmontando',
    unmounted: 'Desmontada',
    error: 'Error',
  };

  function app() {
    return global.OM.app;
  }

  function render(params) {
    cards = new Map();
    container = h('div.view__inner');
    summaryNode = h('section.summary');
    listNode = h('div.drives');

    const mounts = app().state.mounts;

    mount(container, [
      h('header.view__header', [
        h('div.view__heading', [
          h('div.kicker', 'almacenamiento remoto'),
          h('h1.view__title', 'Unidades'),
          h(
            'p.view__sub',
            mounts.length
              ? 'Cada unidad es un bucket publicado como disco de red en este equipo.'
              : 'Todavía no hay ninguna unidad configurada.'
          ),
        ]),
        h('div.view__actions', [
          mounts.length
            ? h(
                'button.btn.btn--outline',
                { type: 'button', onclick: (e) => mountAll(e.currentTarget) },
                [icon('power', 16, 'btn__icon'), h('span', 'Montar todas')]
              )
            : null,
          h(
            'button.btn.btn--primary',
            { type: 'button', onclick: () => global.OM.driveForm.open() },
            [icon('plus', 16, 'btn__icon'), h('span', 'Nueva unidad')]
          ),
        ]),
      ]),
      mounts.length ? summaryNode : null,
      mounts.length ? listNode : emptyState(),
    ]);

    if (mounts.length) {
      paintSummary();
      for (const m of mounts) {
        const card = buildCard(m);
        cards.set(m.id, card);
        listNode.appendChild(card.root);
      }
      if (params && params.focus) highlight(params.focus);
    }

    return container;
  }

  function leave() {
    cards = new Map();
  }

  function highlight(mountId) {
    const card = cards.get(mountId);
    if (!card) return;
    card.root.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.root.style.transition = 'box-shadow 400ms ease';
    card.root.style.boxShadow = 'var(--shadow-focus)';
    setTimeout(() => {
      card.root.style.boxShadow = '';
    }, 1400);
  }

  /* -------------------------------------------------------------- resumen */

  function paintSummary() {
    if (!summaryNode) return;
    const summary = app().counts();
    const speed = Object.values(app().state.stats).reduce((s, x) => s + ((x && x.speed) || 0), 0);
    const moved = Object.values(app().state.stats).reduce((s, x) => s + ((x && x.bytes) || 0), 0);
    const cached = Object.values(app().state.stats).reduce(
      (s, x) => s + ((x && x.cache && x.cache.bytesUsed) || 0),
      0
    );

    mount(summaryNode, [
      statTile('Unidades', String(summary.total), null, 'configuradas', true),
      statTile(
        'Montadas',
        String(summary.mounted),
        null,
        summary.errored ? `${summary.errored} con error` : 'activas ahora'
      ),
      statTile('Transferencia', ...splitValue(fmt.speed(speed)), 'en este momento'),
      statTile('Caché local', ...splitValue(fmt.bytes(cached)), `${fmt.bytes(moved)} movidos`),
    ]);
  }

  function splitValue(text) {
    const at = text.lastIndexOf(' ');
    return at === -1 ? [text, null] : [text.slice(0, at), text.slice(at + 1)];
  }

  function statTile(label, value, unit, foot, accent) {
    return h(`div.stat${accent ? '.stat--accent' : ''}`, [
      h('div.stat__label', label),
      h('div.stat__value', [value, unit ? h('span.stat__unit', unit) : null]),
      foot ? h('div.stat__foot', foot) : null,
    ]);
  }

  /* ---------------------------------------------------------- estado vacío */

  function emptyState() {
    const hasKeys = app().state.connections.some((c) => c.hasSecret);

    return h('div.card', [
      h('div.empty', [
        h('div.empty__art', icon('drive', 34)),
        h('h2.empty__title', 'Conecta tu primer bucket'),
        h(
          'p.empty__text',
          hasKeys
            ? 'Indica el bucket y aparecerá como una unidad más en el Explorador.'
            : 'Indica el bucket y tus claves de acceso. En unos segundos lo tendrás como una unidad de Windows.'
        ),
        h('div.empty__actions', [
          h(
            'button.btn.btn--primary.btn--lg',
            { type: 'button', onclick: () => global.OM.driveForm.open() },
            [icon('plus', 18, 'btn__icon'), h('span', 'Nueva unidad')]
          ),
        ]),
      ]),
    ]);
  }

  /* ------------------------------------------------------------- tarjeta */

  function buildCard(mountCfg) {
    const root = h('div.drive');
    const card = { root, config: mountCfg };
    paintCard(card);
    return card;
  }

  function paintCard(card) {
    const mountCfg = card.config;
    const status = app().statusOf(mountCfg.id);
    const stats = app().state.stats[mountCfg.id];
    const connection = app().connectionOf(mountCfg.connectionId);
    const isMounted = status.state === 'mounted';
    const isBusy = status.state === 'mounting' || status.state === 'unmounting';
    const isError = status.state === 'error';

    card.root.className = `drive${isMounted ? ' is-mounted' : ''}${isError ? ' is-error' : ''}`;

    const speedNode = h('div.live__value', stats ? fmt.speed(stats.speed) : '—');
    const movedNode = h('div.live__value', stats ? fmt.bytes(stats.bytes) : '—');
    const cacheNode = h(
      'div.live__value',
      stats && stats.cache ? fmt.bytes(stats.cache.bytesUsed) : '—'
    );
    const transferNode = h('div.drive__transfer', { style: { display: 'none' } });

    card.speed = speedNode;
    card.moved = movedNode;
    card.cache = cacheNode;
    card.transfers = transferNode;

    mount(card.root, [
      h('div.drive__main', [
        h(
          `div.drive-letter${isMounted ? '.is-mounted' : ''}${isError ? '.is-error' : ''}`,
          mountCfg.driveLetter
        ),
        h('div.drive__id', [
          h('div.drive__name', [
            h(`span.dot.${dotClass(status.state)}`),
            h('span.drive__name-text', mountCfg.name),
          ]),
          h(
            'div.drive__path',
            `${mountCfg.bucket}${mountCfg.prefix ? `/${mountCfg.prefix}` : ''}`
          ),
          h('div.drive__meta', [
            h(
              `span.badge.${badgeClass(status.state)}`,
              [h('span', STATE_TEXT[status.state] || status.state)]
            ),
            connection
              ? h('span.badge.badge--neutral', [icon('cloud', 12), serverName(connection)])
              : h('span.badge.badge--error', 'Faltan las claves'),
            mountCfg.readOnly
              ? h('span.badge.badge--neutral', [icon('lock', 12), 'Solo lectura'])
              : null,
            mountCfg.autoMount
              ? h('span.badge.badge--brand', [icon('power', 12), 'Automática'])
              : null,
          ]),
        ]),
        h('div.drive__actions', cardActions(card, status, isMounted, isBusy)),
      ]),

      isError && status.error
        ? h('div.drive__error', [icon('alert', 16), h('span.selectable', status.error)])
        : null,

      isMounted
        ? h('div.drive__live', [
            h('div.live', [h('div.live__label', 'Velocidad'), speedNode]),
            h('div.live', [h('div.live__label', 'Transferido'), movedNode]),
            h('div.live', [h('div.live__label', 'Caché'), cacheNode]),
          ])
        : null,

      isMounted ? transferNode : null,
    ]);

    if (stats) paintTransfers(card, stats);
  }

  function cardActions(card, status, isMounted, isBusy) {
    const id = card.config.id;

    const primary = isMounted
      ? h(
          'button.btn.btn--outline.btn--sm',
          {
            type: 'button',
            disabled: isBusy,
            title: 'Desmontar la unidad',
            onclick: (e) => doUnmount(id, e.currentTarget),
          },
          [icon('stop', 14, 'btn__icon'), h('span', 'Desmontar')]
        )
      : h(
          'button.btn.btn--primary.btn--sm',
          {
            type: 'button',
            disabled: isBusy,
            title: 'Montar la unidad',
            onclick: (e) => doMount(id, e.currentTarget),
          },
          [icon('play', 14, 'btn__icon'), h('span', 'Montar')]
        );

    const iconBtn = (name, tip, handler, disabled) =>
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': tip, disabled: Boolean(disabled), onclick: handler },
        icon(name, 15)
      );

    return [
      primary,
      iconBtn('external', 'Abrir en el Explorador', () => open(id), !isMounted),
      iconBtn('rotate', 'Volver a montar', (e) => doRemount(id, e.currentTarget), !isMounted || isBusy),
      iconBtn('refresh', 'Vaciar caché de directorios', (e) => doRefresh(id, e.currentTarget), !isMounted),
      iconBtn('terminal', 'Ver el registro', () => app().navigate('logs', { mountId: id })),
      iconBtn('edit', 'Editar la unidad', () => global.OM.driveForm.open({ editId: id }), isMounted),
      iconBtn('trash', 'Eliminar la unidad', () => remove(card.config)),
    ];
  }

  function paintTransfers(card, stats) {
    if (!card.transfers) return;
    const active = (stats.transferring || []).filter((t) => t && t.name);

    if (!active.length) {
      card.transfers.style.display = 'none';
      return;
    }

    card.transfers.style.display = '';
    mount(card.transfers, [
      h('div.live__label', { style: { marginBottom: 'var(--sp-2)' } }, 'Transferencias en curso'),
      ...active.map((item) => {
        const pct =
          typeof item.percentage === 'number'
            ? item.percentage
            : item.size > 0
              ? Math.round((item.bytes / item.size) * 100)
              : 0;
        return h('div', [
          h('div.transfer-row', [
            h('div.transfer-row__name', fmt.middleEllipsis(item.name, 56)),
            h('div.transfer-row__pct', `${pct} %`),
          ]),
          h('div.progress', { style: { height: '4px' } }, [
            h('div.progress__bar', { style: { width: `${Math.min(100, Math.max(0, pct))}%` } }),
          ]),
        ]);
      }),
    ]);
  }

  /** Host of the server a connection points at, shown on the drive card. */
  function serverName(connection) {
    return String(connection.endpoint || '').replace(/^https?:[/][/]/, '') || 'unknown server';
  }

  function dotClass(state) {
    if (state === 'mounted') return 'dot--mounted';
    if (state === 'error') return 'dot--error';
    if (state === 'mounting' || state === 'unmounting') return 'dot--busy';
    return 'dot--idle';
  }

  function badgeClass(state) {
    if (state === 'mounted') return 'badge--rosa';
    if (state === 'error') return 'badge--error';
    if (state === 'mounting' || state === 'unmounting') return 'badge--brand';
    return 'badge--neutral';
  }

  /* -------------------------------------------------------------- eventos */

  function onMountState(status) {
    const card = cards.get(status.id);
    if (card) {
      // Pick up configuration edits alongside the state change.
      const fresh = app().state.mounts.find((m) => m.id === status.id);
      if (fresh) card.config = fresh;
      paintCard(card);
    }
    paintSummary();
  }

  function onMountStats(mountId, stats) {
    const card = cards.get(mountId);
    if (card && card.speed) {
      card.speed.textContent = fmt.speed(stats.speed);
      card.moved.textContent = fmt.bytes(stats.bytes);
      card.cache.textContent = stats.cache ? fmt.bytes(stats.cache.bytesUsed) : '—';
      paintTransfers(card, stats);
    }
    paintSummary();
  }

  /* ------------------------------------------------------------- acciones */

  async function doMount(id, button) {
    await withBusy(button, async () => {
      const result = await app().call(app().api.mounts.mount(id));
      if (result) {
        const cfg = app().state.mounts.find((m) => m.id === id);
        toast.ok(`La unidad ${cfg ? cfg.driveLetter : ''}: está disponible.`, 'Montada');
      }
    });
  }

  async function doUnmount(id, button) {
    const cfg = app().state.mounts.find((m) => m.id === id);
    if (app().state.settings.confirmUnmount) {
      const stats = app().state.stats[id];
      const pending = stats && stats.cache ? stats.cache.uploadsQueued + stats.cache.uploadsInProgress : 0;
      const confirmed = await modal.confirm({
        title: `¿Desmontar ${cfg ? cfg.driveLetter : ''}:?`,
        message: `Se cerrará la unidad "${cfg ? cfg.name : ''}".`,
        detail: pending
          ? `Hay ${pending} subida(s) pendientes. Se intentará completarlas antes de cerrar.`
          : 'Los programas que tengan ficheros abiertos en esa unidad perderán el acceso.',
        confirmLabel: 'Desmontar',
      });
      if (!confirmed) return;
    }

    await withBusy(button, async () => {
      const result = await app().call(app().api.mounts.unmount(id));
      if (result) toast.ok('Unidad desmontada.');
    });
  }

  async function doRemount(id, button) {
    await withBusy(button, async () => {
      const result = await app().call(app().api.mounts.remount(id));
      if (result) toast.ok('Unidad montada de nuevo.');
    });
  }

  async function doRefresh(id, button) {
    await withBusy(button, async () => {
      const result = await app().call(app().api.mounts.refresh(id));
      if (result) toast.ok('Caché de directorios vaciada.');
    });
  }

  async function open(id) {
    await app().call(app().api.mounts.open(id));
  }

  async function mountAll(button) {
    await withBusy(button, async () => {
      const pending = app().state.mounts
        .filter((m) => app().statusOf(m.id).state !== 'mounted')
        .map((m) => m.id);
      if (!pending.length) {
        toast.info('Todas las unidades están ya montadas.');
        return;
      }
      const results = await app().call(app().api.mounts.mountAll(pending));
      if (!results) return;
      const failed = results.filter((r) => !r.ok);
      if (!failed.length) toast.ok(`${results.length} unidad(es) montadas.`);
      else {
        toast.warn(
          `${results.length - failed.length} montadas, ${failed.length} con error. Revisa las tarjetas.`
        );
      }
    });
  }

  async function remove(mountCfg) {
    const confirmed = await modal.confirm({
      title: `¿Eliminar "${mountCfg.name}"?`,
      message: 'Se borra la configuración de esta unidad en OmniMount.',
      detail: 'El contenido del bucket no se toca: sólo se elimina el montaje en este equipo.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    const done = await app().call(app().api.mounts.remove(mountCfg.id));
    if (!done) return;
    await app().loadMounts();
    app().refreshChrome();
    app().renderView();
    toast.ok('Unidad eliminada.');
  }

  global.OM = global.OM || {};
  global.OM.views = global.OM.views || {};
  global.OM.views.dashboard = { render, leave, onMountState, onMountStats };
})(window);

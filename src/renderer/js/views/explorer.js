/* OmniMount - explorador del almacenamiento remoto.
   Habla S3 directamente, así que funciona con la unidad desmontada. */
(function (global) {
  'use strict';

  const { h, mount, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;
  const toast = global.OM.toast;
  const modal = global.OM.modal;

  const view = {
    mountId: null,
    prefix: '',
    entries: [],
    selected: new Set(),
    loading: false,
    nextToken: null,
    truncated: false,
    error: null,
  };

  let container = null;
  let listNode = null;
  let barNode = null;
  let footNode = null;
  let unsubscribe = null;

  function app() {
    return global.OM.app;
  }

  function currentMount() {
    return app().state.mounts.find((m) => m.id === view.mountId) || null;
  }

  function render(params) {
    const mounts = app().state.mounts;

    // Recuerda la última unidad si sigue existiendo.
    const requested = (params && params.mountId) || view.mountId;
    const target = mounts.find((m) => m.id === requested) || mounts[0] || null;

    if (!target) {
      return h('div.view__inner', [header(mounts), emptyNoMounts()]);
    }

    const changed = view.mountId !== target.id;
    view.mountId = target.id;
    if (changed) {
      view.prefix = target.prefix ? `${target.prefix}/` : '';
      view.selected = new Set();
      view.entries = [];
    }

    container = h('div.view__inner');
    barNode = h('div.explorer__bar');
    listNode = h('div.explorer__list');
    footNode = h('div.explorer__foot');

    mount(container, [
      header(mounts),
      h('div.explorer', [barNode, listNode, footNode]),
    ]);

    listenProgress();
    paintBar();
    load();
    return container;
  }

  function leave() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  function listenProgress() {
    if (unsubscribe) return;
    unsubscribe = app().api.explorer.onProgress((payload) => {
      if (!payload) return;
      if (payload.done) return;
      const verb = payload.kind === 'upload' ? 'Subiendo' : 'Descargando';
      paintFoot(`${verb} ${payload.index}/${payload.total}: ${payload.name}`);
    });
  }

  /* -------------------------------------------------------------- cabecera */

  function header(mounts) {
    const target = currentMount();

    return h('header.view__header', [
      h('div.view__heading', [
        h('div.kicker', 'Contenido remoto'),
        h('h1.view__title', 'Explorador'),
        h(
          'p.view__sub',
          'Navega por el almacenamiento sin montar la unidad. Las operaciones van directas al servidor remoto.'
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

  function emptyNoMounts() {
    return h('div.card', [
      h('div.empty', [
        h('div.empty__art', icon('folder', 34)),
        h('h2.empty__title', 'No hay nada que explorar'),
        h('p.empty__text', 'Crea una unidad y podrás navegar por su contenido desde aquí.'),
        h('div.empty__actions', [
          h(
            'button.btn.btn--primary.btn--lg',
            { type: 'button', onclick: () => app().navigate('wizard') },
            [icon('plus', 18, 'btn__icon'), h('span', 'Nueva unidad')]
          ),
        ]),
      ]),
    ]);
  }

  /* ------------------------------------------------------------ barra */

  function paintBar() {
    const target = currentMount();
    if (!barNode || !target) return;

    const base = target.prefix ? `${target.prefix}/` : '';
    const relative = view.prefix.startsWith(base) ? view.prefix.slice(base.length) : view.prefix;
    const parts = relative.split('/').filter(Boolean);

    const crumbs = [
      h(
        `button.crumb${parts.length === 0 ? '.is-current' : ''}`,
        {
          type: 'button',
          onclick: () => parts.length && goTo(base),
        },
        [icon('bucket', 13), ' ', (target.root || target.bucket || '') + (target.prefix ? `/${target.prefix}` : '')]
      ),
    ];

    parts.forEach((part, index) => {
      crumbs.push(h('span.crumb__sep', '/'));
      const isLast = index === parts.length - 1;
      const next = base + parts.slice(0, index + 1).join('/') + '/';
      crumbs.push(
        h(
          `button.crumb${isLast ? '.is-current' : ''}`,
          { type: 'button', onclick: () => !isLast && goTo(next) },
          part
        )
      );
    });

    const selectedCount = view.selected.size;

    mount(barNode, [
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        {
          type: 'button',
          'data-tip': 'Subir un nivel',
          disabled: !relative,
          onclick: () => goUp(base),
        },
        icon('arrowLeft', 15)
      ),
      h('div.crumbs', crumbs),
      selectedCount
        ? h('span.badge.badge--brand', `${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}`)
        : null,
      selectedCount
        ? h(
            'button.btn.btn--outline.btn--sm',
            { type: 'button', onclick: (e) => download(e.currentTarget) },
            [icon('download', 14, 'btn__icon'), h('span', 'Descargar')]
          )
        : null,
      selectedCount
        ? h(
            'button.btn.btn--danger.btn--sm',
            { type: 'button', onclick: (e) => removeSelected(e.currentTarget) },
            [icon('trash', 14, 'btn__icon'), h('span', 'Eliminar')]
          )
        : null,
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': 'Nueva carpeta', onclick: createFolder },
        icon('folderPlus', 15)
      ),
      h(
        'button.btn.btn--outline.btn--sm',
        { type: 'button', disabled: target.readOnly, onclick: (e) => upload(e.currentTarget) },
        [icon('upload', 14, 'btn__icon'), h('span', 'Subir')]
      ),
      h(
        'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
        { type: 'button', 'data-tip': 'Recargar', onclick: () => load() },
        icon('refresh', 15)
      ),
    ]);
  }

  /* ------------------------------------------------------------ listado */

  async function load(append) {
    const target = currentMount();
    if (!target) return;

    view.loading = true;
    view.error = null;
    if (!append) {
      view.entries = [];
      view.selected = new Set();
    }
    paintList();

    const result = await app().call(
      app().api.explorer.list({
        connectionId: target.connectionId,
        root: target.root || target.bucket,
        prefix: view.prefix,
        token: append ? view.nextToken : undefined,
      }),
      { silent: true }
    );

    view.loading = false;

    if (!result) {
      view.error = 'No se pudo leer el contenido remoto.';
      paintList();
      paintFoot();
      return;
    }

    const incoming = [...result.folders, ...result.objects];
    view.entries = append ? [...view.entries, ...incoming] : incoming;
    view.truncated = result.truncated;
    view.nextToken = result.nextToken;

    paintBar();
    paintList();
    paintFoot();
  }

  function paintList() {
    if (!listNode) return;

    const head = h('div.entry.entry--head', [
      h('input.entry__check', {
        type: 'checkbox',
        title: 'Seleccionar todo',
        checked: view.entries.length > 0 && view.selected.size === view.entries.length,
        onchange: (e) => {
          view.selected = e.target.checked ? new Set(view.entries.map((x) => x.key)) : new Set();
          paintBar();
          paintList();
        },
      }),
      h('div', 'Nombre'),
      h('div', { style: { textAlign: 'right' } }, 'Tamaño'),
      h('div', 'Modificado'),
      h('div'),
    ]);

    if (view.loading && !view.entries.length) {
      mount(listNode, [
        head,
        ...Array.from({ length: 6 }, () =>
          h('div.entry', [
            h('div'),
            h('div.skeleton', { style: { height: '14px', width: '45%' } }),
            h('div.skeleton', { style: { height: '14px' } }),
            h('div.skeleton', { style: { height: '14px', width: '70%' } }),
            h('div'),
          ])
        ),
      ]);
      return;
    }

    if (view.error) {
      mount(listNode, [
        head,
        h('div', { style: { padding: 'var(--sp-6)' } }, [
          h('div.alert.alert--error', [
            icon('alert', 18, 'alert__icon'),
            h('div.alert__body', view.error),
          ]),
        ]),
      ]);
      return;
    }

    if (!view.entries.length) {
      mount(listNode, [
        head,
        h('div.empty', { style: { padding: 'var(--sp-12) var(--sp-6)' } }, [
          h('div.empty__art', icon('folder', 34)),
          h('h2.empty__title', 'Carpeta vacía'),
          h('p.empty__text', 'No hay objetos bajo este prefijo.'),
        ]),
      ]);
      return;
    }

    mount(listNode, [head, ...view.entries.map(entryRow), moreRow()]);
  }

  function entryRow(item) {
    const isFolder = item.type === 'folder';
    const selected = view.selected.has(item.key);

    return h(
      `div.entry${isFolder ? '.entry--folder' : ''}${selected ? '.is-selected' : ''}`,
      {
        ondblclick: () => isFolder && goTo(item.key),
      },
      [
        h('input.entry__check', {
          type: 'checkbox',
          checked: selected,
          onchange: (e) => {
            if (e.target.checked) view.selected.add(item.key);
            else view.selected.delete(item.key);
            paintBar();
            paintList();
          },
        }),
        h('div.entry__name', [
          icon(isFolder ? 'folder' : 'file', 17),
          h(
            'span.entry__name-text',
            { title: item.name, onclick: () => isFolder && goTo(item.key) },
            item.name
          ),
        ]),
        h('div.entry__size', isFolder ? '—' : fmt.bytes(item.size)),
        h('div.entry__date', isFolder ? '' : fmt.dateTime(item.lastModified)),
        h(
          'button.btn.btn--ghost.btn--icon.btn--sm',
          {
            type: 'button',
            title: 'Renombrar',
            onclick: (e) => {
              e.stopPropagation();
              rename(item);
            },
          },
          icon('edit', 14)
        ),
      ]
    );
  }

  function moreRow() {
    if (!view.truncated) return null;
    return h('div', { style: { padding: 'var(--sp-4)', textAlign: 'center' } }, [
      h(
        'button.btn.btn--outline.btn--sm',
        { type: 'button', onclick: (e) => withBusy(e.currentTarget, () => load(true)) },
        [icon('chevronDown', 14, 'btn__icon'), h('span', 'Cargar más')]
      ),
    ]);
  }

  function paintFoot(statusText) {
    if (!footNode) return;
    const folders = view.entries.filter((x) => x.type === 'folder').length;
    const files = view.entries.filter((x) => x.type === 'file').length;
    const bytes = view.entries.reduce((sum, x) => sum + (x.size || 0), 0);

    mount(footNode, [
      h('span', statusText || `${folders} carpeta(s) · ${files} fichero(s) · ${fmt.bytes(bytes)}`),
      h('div.row', [
        view.truncated ? h('span.badge.badge--neutral', 'Listado parcial') : null,
        h(
          'button.btn.btn--ghost.btn--sm',
          { type: 'button', onclick: (e) => computeUsage(e.currentTarget) },
          [icon('activity', 14, 'btn__icon'), h('span', 'Calcular tamaño total')]
        ),
      ]),
    ]);
  }

  /* ---------------------------------------------------------- navegación */

  function goTo(prefix) {
    view.prefix = prefix;
    view.selected = new Set();
    paintBar();
    load();
  }

  function goUp(base) {
    const trimmed = view.prefix.replace(/\/$/, '');
    const at = trimmed.lastIndexOf('/');
    const parent = at === -1 ? base : `${trimmed.slice(0, at)}/`;
    goTo(parent.length < base.length ? base : parent);
  }

  /* ------------------------------------------------------------ acciones */

  async function upload(button) {
    const target = currentMount();
    if (!target) return;

    await withBusy(button, async () => {
      const result = await app().call(
        app().api.explorer.upload({
          connectionId: target.connectionId,
          root: target.root || target.bucket,
          prefix: view.prefix,
        })
      );
      if (!result || result.canceled) {
        paintFoot();
        return;
      }
      if (result.errors && result.errors.length) {
        toast.warn(
          `${result.uploaded} subido(s), ${result.errors.length} con error: ${result.errors[0].message}`
        );
      } else {
        toast.ok(`${result.uploaded} fichero(s) subido(s).`);
      }
      load();
    });
  }

  async function download(button) {
    const target = currentMount();
    if (!target) return;
    const items = view.entries.filter((x) => view.selected.has(x.key));
    const files = items.filter((x) => x.type === 'file');

    if (!files.length) {
      toast.warn('Selecciona al menos un fichero. Las carpetas no se descargan de una vez.');
      return;
    }

    await withBusy(button, async () => {
      const result = await app().call(
        app().api.explorer.download({
          connectionId: target.connectionId,
          root: target.root || target.bucket,
          items: files,
        })
      );
      paintFoot();
      if (!result || result.canceled) return;
      if (result.errors && result.errors.length) {
        toast.warn(`${result.downloaded} descargado(s), ${result.errors.length} con error.`);
      } else {
        toast.ok(`${result.downloaded} fichero(s) en ${result.path}`, 'Descarga completa');
      }
    });
  }

  async function removeSelected(button) {
    const target = currentMount();
    if (!target) return;
    const items = view.entries.filter((x) => view.selected.has(x.key));
    if (!items.length) return;

    const folders = items.filter((x) => x.type === 'folder');
    const confirmed = await modal.confirm({
      title: `¿Eliminar ${items.length} elemento(s)?`,
      message: folders.length
        ? `Entre ellos hay ${folders.length} carpeta(s); se borrará todo su contenido.`
        : 'Los ficheros se eliminarán del almacenamiento remoto.',
      detail: 'Esta acción no se puede deshacer desde OmniMount.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    await withBusy(button, async () => {
      const result = await app().call(
        app().api.explorer.remove({
          connectionId: target.connectionId,
          root: target.root || target.bucket,
          items,
        })
      );
      if (!result) return;
      if (result.errors && result.errors.length) {
        toast.warn(`${result.deleted} eliminado(s), ${result.errors.length} con error.`);
      } else {
        toast.ok(`${result.deleted} objeto(s) eliminado(s).`);
      }
      load();
    });
  }

  async function createFolder() {
    const target = currentMount();
    if (!target) return;

    const name = await modal.prompt({
      title: 'Nueva carpeta',
      label: 'Nombre',
      placeholder: 'documentos',
      hint: 'En S3 una carpeta es un objeto vacío terminado en barra.',
      validate: (value) => (/[\\/]/.test(value) ? 'No puede contener barras.' : null),
    });
    if (!name) return;

    const done = await app().call(
      app().api.explorer.mkdir({
        connectionId: target.connectionId,
        root: target.root || target.bucket,
        prefix: view.prefix,
        name,
      })
    );
    if (!done) return;
    toast.ok('Carpeta creada.');
    load();
  }

  async function rename(item) {
    const target = currentMount();
    if (!target) return;

    if (item.type === 'folder') {
      toast.info(
        'Renombrar una carpeta exigiría copiar todos sus objetos. Hazlo desde la unidad montada.',
        'No disponible aquí'
      );
      return;
    }

    const name = await modal.prompt({
      title: 'Renombrar',
      label: 'Nuevo nombre',
      value: item.name,
      validate: (value) => (/[\\/]/.test(value) ? 'No puede contener barras.' : null),
    });
    if (!name || name === item.name) return;

    const done = await app().call(
      app().api.explorer.rename({
        connectionId: target.connectionId,
        root: target.root || target.bucket,
        key: item.key,
        newName: name,
      })
    );
    if (!done) return;
    toast.ok('Renombrado.');
    load();
  }

  async function computeUsage(button) {
    const target = currentMount();
    if (!target) return;

    await withBusy(button, async () => {
      paintFoot('Recorriendo el prefijo...');
      const usage = await app().call(
        app().api.explorer.usage({
          connectionId: target.connectionId,
          root: target.root || target.bucket,
          prefix: view.prefix,
        })
      );
      if (!usage) {
        paintFoot();
        return;
      }
      paintFoot(
        `${fmt.number(usage.count)} objeto(s) · ${fmt.bytes(usage.bytes)} en total bajo este prefijo`
      );
    });
  }

  global.OM = global.OM || {};
  global.OM.views = global.OM.views || {};
  global.OM.views.explorer = { render, leave };
})(window);

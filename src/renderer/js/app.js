/* OmniMount - shell de la aplicación: estado, enrutado y barra lateral. */
(function (global) {
  'use strict';

  const { h, mount, clear } = global.OM.dom;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;
  const toast = global.OM.toast;
  const api = global.omni;

  const state = {
    ready: false,
    route: 'dashboard',
    routeParams: {},
    settings: {},
    appInfo: {},
    deps: null,
    connections: [],
    mounts: [],
    statuses: {},
    stats: {},
  };

  const NAV = [
    { route: 'dashboard', label: 'Unidades', icon: 'drive' },
    { route: 'explorer', label: 'Explorador', icon: 'folder' },
    { route: 'logs', label: 'Registro', icon: 'terminal' },
    { route: 'settings', label: 'Ajustes', icon: 'settings' },
  ];

  /* ----------------------------------------------------------------- api */

  /**
   * Unwrap the {ok, data} envelope every IPC handler returns. By default a
   * failure raises a toast and returns null, so call sites stay flat; pass
   * {throwOnError:true} where the caller needs to react.
   */
  async function call(promise, options) {
    const opts = options || {};
    let result;
    try {
      result = await promise;
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      if (!opts.silent) toast.error(message);
      if (opts.throwOnError) throw new Error(message);
      return null;
    }
    if (!result || result.ok !== true) {
      const message = (result && result.error) || 'Error desconocido.';
      if (!opts.silent) toast.error(message);
      if (opts.throwOnError) throw new Error(message);
      return null;
    }
    return result.data;
  }

  /* --------------------------------------------------------------- tema */

  function applyTheme(preference) {
    const choice = preference || state.settings.theme || 'system';
    const dark =
      choice === 'dark' ||
      (choice === 'system' && global.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    paintBrand();
  }

  // The mark follows the theme through currentColor, so it only has to be
  // drawn once per container rather than swapped per theme.
  function paintBrand() {
    const bar = document.getElementById('titlebar-brand');
    if (bar && !bar.firstChild) {
      bar.appendChild(global.OM.brand.lockup({ size: 18, accent: 'var(--accent)' }));
    }
    const rail = document.getElementById('sidebar-brand');
    if (rail && !rail.firstChild) {
      rail.appendChild(
        global.OM.brand.lockup({ size: 22, accent: 'var(--accent)', className: 'lockup--rail' })
      );
    }
  }

  /* ------------------------------------------------------------- datos */

  async function loadMounts() {
    const data = await call(api.mounts.list(), { silent: true });
    if (!data) return;
    state.mounts = data.mounts || [];
    state.statuses = {};
    for (const status of data.statuses || []) {
      state.statuses[status.id] = status;
      if (status.stats) state.stats[status.id] = status.stats;
    }
  }

  async function loadConnections() {
    state.connections = (await call(api.connections.list(), { silent: true })) || [];
  }

  async function loadDeps() {
    state.deps = await call(api.deps.check(), { silent: true });
  }

  async function reloadAll() {
    await Promise.all([loadMounts(), loadConnections(), loadDeps()]);
  }

  /* ----------------------------------------------------------- selectores */

  function statusOf(mountId) {
    return state.statuses[mountId] || { id: mountId, state: 'unmounted' };
  }

  function connectionOf(connectionId) {
    return state.connections.find((c) => c.id === connectionId) || null;
  }

  function counts() {
    const list = state.mounts;
    return {
      total: list.length,
      mounted: list.filter((m) => statusOf(m.id).state === 'mounted').length,
      errored: list.filter((m) => statusOf(m.id).state === 'error').length,
      busy: list.filter((m) => ['mounting', 'unmounting'].includes(statusOf(m.id).state)).length,
    };
  }

  function totalSpeed() {
    return Object.values(state.stats).reduce((sum, stat) => {
      return sum + (stat && stat.speed ? stat.speed : 0);
    }, 0);
  }

  /* --------------------------------------------------------- navegación */

  function navigate(route, params) {
    const view = global.OM.views[route];
    if (!view) {
      console.warn(`[app] ruta desconocida: ${route}`);
      return;
    }
    const previous = global.OM.views[state.route];
    if (previous && typeof previous.leave === 'function') previous.leave();

    state.route = route;
    state.routeParams = params || {};
    renderSidebar();
    renderView();
  }

  /* ------------------------------------------------------------ render */

  function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const summary = counts();
    const nodes = NAV.map((item) => {
      if (item.group) return h('div.sidebar__group', item.group);

      let badge = null;
      if (item.route === 'dashboard' && summary.total) {
        const alert = summary.errored > 0;
        badge = h(
          `span.navitem__badge${alert ? '.is-alert' : ''}`,
          alert ? String(summary.errored) : `${summary.mounted}/${summary.total}`
        );
      }

      return h(
        `button.navitem${state.route === item.route ? '.is-active' : ''}`,
        { type: 'button', onclick: () => navigate(item.route) },
        [
          icon(item.icon, 18, 'navitem__icon'),
          h('span.navitem__label', item.label),
          badge,
        ]
      );
    });

    mount(nav, nodes);
    renderSidebarFoot();
  }

  function renderSidebarFoot() {
    const foot = document.getElementById('sidebar-foot');
    if (!foot) return;
    const summary = counts();
    const speed = totalSpeed();

    mount(foot, [
      h('div.sidebar__stat', [
        h('span', 'Unidades activas'),
        h('strong', `${summary.mounted}/${summary.total}`),
      ]),
      h('div.sidebar__stat', [
        h('span', 'Transferencia'),
        h('strong', speed > 0 ? fmt.speed(speed) : '—'),
      ]),
      h('div.sidebar__version', `OmniMount ${state.appInfo.version || ''}`),
    ]);
  }

  function renderTitlebarStatus() {
    const node = document.getElementById('titlebar-status');
    if (!node) return;
    const summary = counts();

    let dotClass = 'dot--idle';
    let label = 'Sin unidades montadas';
    if (summary.errored) {
      dotClass = 'dot--error';
      label = `${summary.errored} con error`;
    } else if (summary.busy) {
      dotClass = 'dot--busy';
      label = 'Trabajando...';
    } else if (summary.mounted) {
      dotClass = 'dot--mounted';
      label = `${fmt.pluralise(summary.mounted, 'unidad montada', 'unidades montadas')}`;
    }

    mount(node, [h(`span.dot.${dotClass}`), h('span', label)]);
  }

  function renderView() {
    const container = document.getElementById('view');
    if (!container) return;

    const view = global.OM.views[state.route];
    container.classList.remove('is-entering');
    mount(container, view.render(state.routeParams));
    container.scrollTop = 0;
    // Re-trigger the entry animation on every navigation.
    void container.offsetWidth;
    container.classList.add('is-entering');

    renderTitlebarStatus();
  }

  function refreshChrome() {
    renderSidebar();
    renderTitlebarStatus();
  }

  /* -------------------------------------------------------------- eventos */

  function wireEvents() {
    api.mounts.onState((status) => {
      state.statuses[status.id] = status;
      if (!status.stats) delete state.stats[status.id];
      refreshChrome();

      const view = global.OM.views[state.route];
      if (view && typeof view.onMountState === 'function') view.onMountState(status);
    });

    api.mounts.onStats(({ mountId, stats }) => {
      state.stats[mountId] = stats;
      renderSidebarFoot();

      const view = global.OM.views[state.route];
      if (view && typeof view.onMountStats === 'function') view.onMountStats(mountId, stats);
    });

    api.mounts.onLog((payload) => {
      const view = global.OM.views[state.route];
      if (view && typeof view.onMountLog === 'function') view.onMountLog(payload);
    });

    api.settings.onChanged((settings) => {
      state.settings = settings;
      applyTheme(settings.theme);
    });

    api.ui.onNavigate((payload) => {
      if (!payload) return;
      if (payload.view === 'wizard') global.OM.driveForm.open();
      else if (payload.view === 'mount') navigate('dashboard', { focus: payload.id });
      else if (payload.view) navigate(payload.view, payload);
    });

    api.deps.onProgress((payload) => global.OM.setup.onProgress(payload));

    global
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if ((state.settings.theme || 'system') === 'system') applyTheme('system');
      });
  }

  /* ----------------------------------------------------------- arranque */

  /**
   * Deja el equipo preparado sin pedir nada. Es lo que hace que la aplicación
   * esté lista para usar en cuanto termina de abrirse por primera vez.
   */
  async function runSetup() {
    global.OM.setup.reset();
    global.OM.setup.show();

    try {
      await call(api.deps.ensure(), { silent: true, throwOnError: true });
      await loadDeps();

      if (!state.deps || !state.deps.ready) {
        throw new Error(
          'Los componentes se instalaron pero Windows todavía no los detecta. Reinicia el equipo y vuelve a abrir OmniMount.'
        );
      }

      global.OM.setup.succeed('Todo listo.');
      setTimeout(() => global.OM.setup.hide(), 850);
      return true;
    } catch (err) {
      global.OM.setup.fail(err.message, () => runSetup());
      return false;
    }
  }

  async function boot() {
    state.appInfo = (await call(api.app.info(), { silent: true })) || {};
    state.settings = (await call(api.settings.get(), { silent: true })) || {};
    applyTheme(state.settings.theme);

    // Las escuchas se ponen ANTES de pedir los datos: si se montara algo
    // entre la lectura y el enganche, ese aviso se perdería y la unidad se
    // quedaría mostrando un estado que ya no es el suyo.
    wireEvents();

    await reloadAll();
    state.ready = true;

    navigate('dashboard');

    // El primer arranque instala lo que falte por su cuenta; los siguientes
    // no ven esta pantalla en absoluto.
    if (!state.deps || !state.deps.ready) {
      await runSetup();
      refreshChrome();
      renderView();
    }

    if (!state.appInfo.encryptionAvailable) {
      toast.warn(
        'Windows no ofrece cifrado de credenciales en esta sesión. No se podrán guardar claves de acceso.',
        'Cifrado no disponible'
      );
    }
  }

  // El arranque va aquí y no en un <script> inline porque la CSP del
  // renderer prohíbe scripts en línea. Para cuando salta DOMContentLoaded ya
  // se han ejecutado todos los scripts clásicos, así que las vistas están
  // registradas.
  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((err) => {
      console.error('[app] fallo en el arranque:', err);
      const view = document.getElementById('view');
      if (view) {
        mount(view, h('div.view__inner', [
          h('div.alert.alert--error', [
            h('div.alert__body', [
              h('div.alert__title', 'OmniMount no pudo arrancar'),
              h('span.selectable', err && err.message ? err.message : String(err)),
            ]),
          ]),
        ]));
      }
    });
  });

  global.OM = global.OM || {};
  global.OM.views = global.OM.views || {};
  global.OM.app = {
    state,
    call,
    api,
    navigate,
    renderView,
    refreshChrome,
    reloadAll,
    loadMounts,
    loadConnections,
    loadDeps,
    statusOf,
    connectionOf,
    counts,
    applyTheme,
    boot,
    runSetup,
  };
})(window);

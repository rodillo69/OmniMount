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
    // What the updater last reported. Read by the Settings card; the notice
    // is driven by its own event.
    update: { status: 'idle' },
  };

  // Keys, not text. This list is built when the file loads, which happens
  // before the language is known: resolving the labels here would freeze the
  // whole sidebar in whichever language happened to be the default.
  const NAV = [
    { route: 'dashboard', labelKey: 'app.unidades', icon: 'drive' },
    { route: 'explorer', labelKey: 'app.explorador', icon: 'folder' },
    { route: 'logs', labelKey: 'app.registro', icon: 'terminal' },
    { route: 'settings', labelKey: 'app.ajustes', icon: 'settings' },
  ];

  /* ----------------------------------------------------------------- api */

  /**
   * Unwrap the {ok, data} envelope every IPC handler returns. By default a
   * failure raises a toast and returns null, so call sites stay flat; pass
   * {throwOnError:true} where the caller needs to react.
   */
  // Failures the main process raises with a code have a translated text here.
  // Everything else falls back to the message it sent.
  // Errors from the main process travel as a code, not as a sentence: the
  // main process has no translation catalogue, and a message written there
  // would always come out in one language whatever the user picked.
  const CODE_TEXT = {
    ELEVATED: 'elevation.mountBlocked',
    NEEDS_ADMIN: 'setup.necesitaAdministrador',
    UAC_DECLINED: 'setup.permisoRechazado',
    WINFSP_MISSING: 'err.winfspMissing',
    RCLONE_MISSING: 'err.rcloneMissing',
    DPAPI_UNAVAILABLE: 'err.dpapiUnavailable',
    WINFSP_REBOOT: 'err.winfspReboot',
    CACHE_NETWORK: 'err.cacheNetwork',
    CACHE_OPTICAL: 'err.cacheOptical',
    CACHE_REMOVABLE: 'err.cacheRemovable',
    CACHE_FILESYSTEM: 'err.cacheFilesystem',
    CACHE_OWNMOUNT: 'err.cacheOwnMount',
    CACHE_NOTWRITABLE: 'err.cacheNotWritable',
    CACHE_UNREADABLE: 'err.cacheUnreadable',
    CACHE_UNKNOWN: 'err.cacheUnknown',
  };

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
      const key = result && result.code ? CODE_TEXT[result.code] : null;
      const message = (key && t(key)) || (result && result.error) || t('app.unknownError');
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

  // Reloads the drives and puts them on screen. Only the dashboard is
  // re-rendered: redrawing the explorer would throw the user back to the root
  // of whatever folder they were reading, and a drive appearing elsewhere is
  // not worth that.
  let catchingUp = false;
  async function catchUp() {
    if (catchingUp) return;
    catchingUp = true;
    try {
      await loadMounts();
      refreshChrome();
      if (state.route === 'dashboard') renderView();
    } finally {
      catchingUp = false;
    }
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
          h('span.navitem__label', t(item.labelKey)),
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
        h('span', t('app.unidadesActivas')),
        h('strong', `${summary.mounted}/${summary.total}`),
      ]),
      h('div.sidebar__stat', [
        h('span', t('app.transferencia')),
        h('strong', speed > 0 ? fmt.speed(speed) : '—'),
      ]),
      h('div.sidebar__version', `OmniMount ${state.appInfo.version || ''}`),
    ]);
  }

  function renderTitlebarStatus() {
    paintWindowControls();

    const node = document.getElementById('titlebar-status');
    if (!node) return;
    const summary = counts();

    let dotClass = 'dot--idle';
    let label = t('status.noneMounted');
    if (summary.errored) {
      dotClass = 'dot--error';
      label = t('status.withError', { count: summary.errored });
    } else if (summary.busy) {
      dotClass = 'dot--busy';
      label = t('status.working');
    } else if (summary.mounted) {
      dotClass = 'dot--mounted';
      label = t(summary.mounted === 1 ? 'status.oneMounted' : 'status.manyMounted', {
        count: summary.mounted,
      });
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

      // A drive the renderer has never heard of means its copy of the list is
      // out of date: the drive was created in the form, or mounted from the
      // tray, or started automatically. The views patch their cards in place
      // and have nothing to patch for a drive that is not in the list, so
      // without reloading here the panel stays as it was until a restart.
      if (!state.mounts.some((m) => m.id === status.id)) {
        catchUp();
        return;
      }

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

    // A version worth interrupting for. The main process has already
    // weighed what was found against the settings, so anything that arrives
    // here is meant to be seen.
    api.update.onAnnounce((found) => global.OM.updateNotice.open(found));

    api.update.onState((payload) => {
      state.update = payload;
      global.OM.updateNotice.onState(payload);
      const view = global.OM.views[state.route];
      if (view && typeof view.onUpdateState === 'function') view.onUpdateState(payload);
    });

    api.settings.onChanged((settings) => {
      state.settings = settings;
      OM.i18n.setLanguage(settings.language);
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
      const result = await call(api.deps.ensure(), { silent: true, throwOnError: true });
      await loadDeps();

      // A driver that installed but is not loaded yet is not a failure to
      // retry: it is a restart. Saying "ready" here would send the user
      // straight into a mount that cannot work.
      if ((result && result.needsReboot) || !state.deps || !state.deps.ready) {
        throw new Error(t('setup.reinicioPendiente'));
      }

      global.OM.setup.succeed(t('setup.listo'));
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
    // Whatever the updater already knows, so Settings opens with the real
    // answer rather than "never checked".
    state.update = (await call(api.update.state(), { silent: true })) || { status: 'idle' };
    // Language before anything is painted, or the first frame renders in the
    // wrong one and flickers when it corrects itself.
    OM.i18n.setLanguage(state.settings.language);
    applyTheme(state.settings.theme);

    // Elevated, with no linked connections: nothing this app mounts would
    // show up in the user's Explorer. Stop here rather than let someone
    // configure a drive that cannot work.
    const privileges = state.appInfo.elevation;
    if (privileges && privileges.elevated && !privileges.linkedConnections) {
      global.OM.elevation.show(async () => {
        const done = await call(api.app.relaunchUnelevated(), { silent: true });
        return done === true;
      });
      return;
    }

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
              h('div.alert__title', t('app.omnimountNoPudoArrancar')),
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
  /* ------------------------------------------------------- window buttons */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let isMaximized = false;

  /**
   * Glyph for a window button.
   *
   * Built here rather than through OM.dom.svg because these need the shell's
   * look: a 1px square-ended stroke on a 10x10 grid. The shared helper draws
   * 1.7px rounded strokes, which reads as hand-drawn next to the system
   * chrome. Inline SVG also avoids depending on the Segoe icon font, which is
   * missing on some builds and would render as a hollow box.
   */
  function glyph(paths) {
    const node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', '0 0 10 10');
    node.setAttribute('width', '10');
    node.setAttribute('height', '10');
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', 'currentColor');
    node.setAttribute('stroke-width', '1');
    node.setAttribute('aria-hidden', 'true');
    for (const d of [].concat(paths)) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      node.appendChild(path);
    }
    return node;
  }

  /** Minimise, maximise and close: 46x32, the same metrics as the shell. */
  function paintWindowControls() {
    const host = document.getElementById('titlebar-controls');
    if (!host) return;

    const button = (name, label, paths, onclick) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'wincontrol wincontrol--' + name;
      el.title = label;
      el.setAttribute('aria-label', label);
      el.addEventListener('click', onclick);
      el.appendChild(glyph(paths));
      return el;
    };

    OM.dom.clear(host);

    host.appendChild(
      button('min', t('window.minimize'), 'M0.5 5.5 H9.5', () => window.omni.window.minimize())
    );

    host.appendChild(
      button(
        'max',
        isMaximized ? t('window.restore') : t('window.maximize'),
        isMaximized
          ? ['M0.5 3.5 H6.5 V9.5 H0.5 Z', 'M3 3.5 V1 H9 V7 H6.5']
          : 'M0.5 0.5 H9.5 V9.5 H0.5 Z',
        async () => {
          const result = await window.omni.window.toggleMaximize();
          if (result && result.ok && result.data) setMaximized(result.data.maximized);
        }
      )
    );

    host.appendChild(
      button('close', t('window.close'), ['M0.5 0.5 L9.5 9.5', 'M9.5 0.5 L0.5 9.5'], () =>
        window.omni.window.close()
      )
    );
  }

  function setMaximized(value) {
    if (isMaximized === value) return;
    isMaximized = value;
    paintWindowControls();
  }

})(window);

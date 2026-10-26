/* OmniMount - ajustes. */
(function (global) {
  'use strict';

  const { h, switchRow, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const toast = global.OM.toast;
  const modal = global.OM.modal;

  const THEMES = [
    { key: 'system', label: 'Sistema' },
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Oscuro' },
  ];

  function app() {
    return global.OM.app;
  }

  function render() {
    const settings = app().state.settings;
    const info = app().state.appInfo;

    return h('div.view__inner', [
      h('header.view__header', [
        h('div.view__heading', [
          h('div.kicker', 'Preferencias'),
          h('h1.view__title', 'Ajustes'),
          h('p.view__sub', 'Comportamiento de OmniMount en este equipo.'),
        ]),
      ]),

      h('div.stack.stack--lg', [
        card('Apariencia', null, [
          setting(
            'Tema',
            'El modo sistema sigue a la configuración de Windows.',
            h(
              'div.segmented',
              THEMES.map((theme) =>
                h(
                  `button.segmented__item${settings.theme === theme.key ? '.is-active' : ''}`,
                  { type: 'button', onclick: () => update({ theme: theme.key }) },
                  theme.label
                )
              )
            )
          ),
        ]),

        card('Arranque', 'Qué hace la aplicación al iniciarse y al cerrarla.', [
          switchRow('Iniciar con Windows', settings.autostart, (v) => update({ autostart: v }), {
            hint: 'Las unidades estarán disponibles nada más encender el equipo.',
          }),
          switchRow(
            'Arrancar en segundo plano',
            settings.startMinimized,
            (v) => update({ startMinimized: v }),
            { hint: 'Sin abrir la ventana. Sólo aplica al iniciar con Windows.' }
          ),
          switchRow(
            'Montar las unidades automáticas al abrir',
            settings.mountOnStart,
            (v) => update({ mountOnStart: v })
          ),
          switchRow(
            'Al cerrar la ventana, seguir en segundo plano',
            settings.closeToTray,
            (v) => update({ closeToTray: v }),
            {
              hint:
                'Recomendado: las unidades siguen funcionando. Si lo desactivas, cerrar la ventana las desmonta.',
            }
          ),
          switchRow(
            'Pedir confirmación al desmontar',
            settings.confirmUnmount,
            (v) => update({ confirmUnmount: v })
          ),
        ]),

        keysCard(),
        componentsCard(),
        maintenanceCard(info),
        aboutCard(info),
      ]),
    ]);
  }

  /* ----------------------------------------------------------- claves */

  function keysCard() {
    const keys = app().state.connections.filter((c) => c.hasSecret);

    return card(
      'Claves de acceso',
      'Las credenciales del almacenamiento remoto, cifradas con Windows.',
      keys.length
        ? keys.map((conn) => {
            const usedBy = app().state.mounts.filter((m) => m.connectionId === conn.id);
            return h('div.setting', [
              h('div.row', { style: { alignItems: 'center', gap: 'var(--sp-3)' } }, [
                h(
                  'div',
                  {
                    style: {
                      flex: 'none',
                      width: '32px',
                      height: '32px',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    },
                  },
                  icon('key', 16)
                ),
                h('div', [
                  h('div.row', { style: { gap: 'var(--sp-2)', alignItems: 'center' } }, [
                    h('span.setting__label.mono', conn.accessKeyId),
                    h('span.badge.badge--neutral', regionName(conn)),
                  ]),
                  h(
                    'div.setting__hint',
                    usedBy.length
                      ? `En uso por ${usedBy.map((m) => `${m.driveLetter}:`).join(', ')}`
                      : 'Sin unidades asociadas'
                  ),
                ]),
              ]),
              h('div.setting__control.row', [
                h(
                  'button.btn.btn--outline.btn--sm',
                  { type: 'button', onclick: (e) => replaceKey(conn, e.currentTarget) },
                  'Cambiar'
                ),
                h(
                  'button.btn.btn--ghost.btn--icon.btn--sm.tooltip',
                  {
                    type: 'button',
                    'data-tip': 'Eliminar',
                    onclick: () => removeKey(conn, usedBy),
                  },
                  icon('trash', 15)
                ),
              ]),
            ]);
          })
        : [
            h('p.muted', { style: { fontSize: 'var(--fs-sm)' } },
              'Todavía no hay claves guardadas. Se piden al crear la primera unidad.'),
          ]
    );
  }

  async function replaceKey(conn, button) {
    const secret = await modal.prompt({
      title: 'Cambiar la Secret Key',
      description: `Para la Access Key ${conn.accessKeyId}.`,
      label: 'Nueva Secret Key',
      placeholder: 'Secret Key',
    });
    if (!secret) return;

    await withBusy(button, async () => {
      const saved = await app().call(
        app().api.connections.save({ ...conn, secretAccessKey: secret })
      );
      if (!saved) return;
      await app().loadConnections();
      app().renderView();
      toast.ok('Clave actualizada.');
    });
  }

  async function removeKey(conn, usedBy) {
    if (usedBy.length) {
      toast.warn(
        `La usan las unidades ${usedBy.map((m) => `${m.driveLetter}:`).join(', ')}. Elimínalas primero.`,
        'Clave en uso'
      );
      return;
    }
    const confirmed = await modal.confirm({
      title: '¿Eliminar estas claves?',
      message: `Se borrará la Access Key ${conn.accessKeyId} de este equipo.`,
      detail: 'No afecta a los datos del almacenamiento remoto.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    const done = await app().call(app().api.connections.remove(conn.id));
    if (!done) return;
    await app().loadConnections();
    app().renderView();
    toast.ok('Claves eliminadas.');
  }

  /** Nombre legible de la región de una conexión guardada. */
  function regionName(conn) {
    const regions = app().state.appInfo.regions || [];
    const match =
      regions.find((r) => r.id === conn.regionId) ||
      regions.find((r) => r.endpoint === conn.endpoint);
    return match ? match.name : 'desconocida';
  }

  /* ------------------------------------------------------- componentes */

  function componentsCard() {
    const deps = app().state.deps;
    const ready = deps && deps.ready;

    return card(
      'Componentes',
      'Lo que OmniMount instaló para poder crear unidades.',
      [
        h('div.setting', [
          h('div.row', { style: { alignItems: 'center', gap: 'var(--sp-3)' } }, [
            h(
              'div',
              {
                style: {
                  flex: 'none',
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 'var(--r-sm)',
                  background: ready ? 'var(--fn-ok-bg)' : 'var(--fn-warn-bg)',
                  color: ready ? 'var(--fn-ok)' : 'var(--fn-warn)',
                },
              },
              icon(ready ? 'checkCircle' : 'alert', 16)
            ),
            h('div', [
              h('div.setting__label', ready ? 'Todo instalado' : 'Falta algún componente'),
              h(
                'div.setting__hint',
                deps
                  ? [
                      deps.rclone.installed
                        ? `Motor ${deps.rclone.version}`
                        : 'Motor no instalado',
                      ' · ',
                      deps.winfsp.installed
                        ? `Controlador ${deps.winfsp.version}`
                        : 'Controlador no instalado',
                    ]
                  : 'Comprobando...'
              ),
            ]),
          ]),
          h('div.setting__control', [
            h(
              'button.btn.btn--outline.btn--sm',
              { type: 'button', onclick: (e) => recheck(e.currentTarget) },
              ready ? 'Comprobar' : 'Instalar ahora'
            ),
          ]),
        ]),
      ]
    );
  }

  async function recheck(button) {
    await withBusy(button, async () => {
      await app().loadDeps();
      const deps = app().state.deps;

      if (deps && deps.ready) {
        app().renderView();
        toast.ok('Todos los componentes están instalados.');
        return;
      }
      // Falta algo: se instala sin más preguntas, igual que en el primer
      // arranque.
      const ok = await global.OM.app.runSetup();
      await app().loadDeps();
      app().renderView();
      if (ok) toast.ok('Componentes instalados.');
    });
  }

  /* ------------------------------------------------------ mantenimiento */

  // Aquí sólo hay sitios a los que ir, no valores que escribir. El endpoint y
  // los parámetros del motor no se exponen a propósito: son el servicio, no
  // una preferencia, y teclear algo distinto sólo rompe todas las unidades.
  function maintenanceCard(info) {
    return card('Mantenimiento', 'Dónde guarda sus cosas la aplicación.', [
      linkRow(
        'Carpeta de datos',
        'Configuración y claves cifradas.',
        'folder',
        () => app().call(app().api.app.openPath(info.userData))
      ),
      linkRow(
        'Caché local',
        'Los ficheros que se han abierto o escrito. Se limpia sola.',
        'package',
        () => app().call(app().api.app.openPath(info.cacheDir))
      ),
      linkRow(
        'Registro de la aplicación',
        'Para enviar a soporte si algo falla.',
        'terminal',
        () => app().call(app().api.app.revealLog())
      ),
    ]);
  }

  function linkRow(label, hint, iconName, handler) {
    return h('div.setting', [
      h('div.row', { style: { alignItems: 'flex-start', gap: 'var(--sp-3)' } }, [
        h(
          'div',
          {
            style: {
              flex: 'none',
              width: '30px',
              height: '30px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 'var(--r-sm)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
            },
          },
          icon(iconName, 15)
        ),
        h('div', [
          h('div.setting__label', label),
          hint ? h('div.setting__hint', hint) : null,
        ]),
      ]),
      h('div.setting__control', [
        h('button.btn.btn--outline.btn--sm', { type: 'button', onclick: handler }, 'Abrir'),
      ]),
    ]);
  }

  /* --------------------------------------------------------- acerca de */

  function card(title, description, children) {
    return h('div.card', [
      h('div.card__head', [
        h('div', [
          h('div.card__title', title),
          description ? h('div.card__desc', description) : null,
        ]),
      ]),
      h('div.card__body', h('div.settings-group', children)),
    ]);
  }

  function setting(label, hint, control) {
    return h('div.setting', [
      h('div', [
        h('div.setting__label', label),
        hint ? h('div.setting__hint', hint) : null,
      ]),
      h('div.setting__control', control),
    ]);
  }

  function aboutCard(info) {
    return h('div.card.card--accent', [
      h('div.card__head', [
        h('div.row', { style: { gap: 'var(--sp-4)', alignItems: 'center' } }, [
          global.OM.brand.mark(30, 'var(--accent)'),
          h('div', [
            h('div.card__title', 'OmniMount'),
            h('div.card__desc', `Versión ${info.version || '—'}`),
          ]),
        ]),
        h('div.row', [
          h(
            'button.btn.btn--ghost.btn--sm',
            {
              type: 'button',
              onclick: () => app().call(app().api.app.openExternal('https://github.com/rodillo69/OmniMount')),
            },
            [icon('external', 14, 'btn__icon'), h('span', 'github.com/rodillo69/OmniMount')]
          ),
        ]),
      ]),
      h('div.card__body', [
        h('dl.about-grid', [
          h('dt', 'Versión'),
          h('dd', info.version || '—'),
          h('dt', 'Regiones'),
          h('dd', (info.regions || []).map((r) => `${r.name}: ${r.endpoint}`).join('  ·  ') || '—'),
          h('dt', 'Motor de transferencia'),
          h('dd', info.rcloneVersion ? `rclone ${info.rcloneVersion}` : 'no instalado'),
          h('dt', 'Plataforma'),
          h('dd', `Electron ${info.electron || '—'} · ${info.platform || ''}`),
          h('dt', 'Cifrado de credenciales'),
          h('dd', info.encryptionAvailable ? 'DPAPI de Windows' : 'no disponible'),
        ]),
      ]),
      h('div.card__foot', [
        h(
          'span.faint',
          { style: { fontSize: 'var(--fs-xs)', marginRight: 'auto' } },
          '© 2026 Miguel Cañadas'
        ),
      ]),
    ]);
  }

  async function update(patch) {
    const next = await app().call(app().api.settings.update(patch));
    if (!next) return;
    app().state.settings = next;
    app().applyTheme(next.theme);
    app().renderView();
  }

  global.OM = global.OM || {};
  global.OM.views = global.OM.views || {};
  global.OM.views.settings = { render };
})(window);

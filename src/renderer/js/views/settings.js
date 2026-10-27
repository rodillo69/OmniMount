/* OmniMount - ajustes. */
(function (global) {
  'use strict';

  const { h, switchRow, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const toast = global.OM.toast;
  const modal = global.OM.modal;

  const THEMES = [
    // Keys: this runs at load, before the language is applied.
    { key: 'system', labelKey: 'settings.sistema' },
    { key: 'light', labelKey: 'settings.claro' },
    { key: 'dark', labelKey: 'settings.oscuro' },
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
          h('div.kicker', t('settings.preferencias')),
          h('h1.view__title', t('settings.ajustes')),
          h('p.view__sub', t('settings.comportamientoDeOmnimountEn')),
        ]),
      ]),

      h('div.stack.stack--lg', [
        card(t('settings.appearance'), null, [
          setting(
            t('settings.theme'),
            t('settings.themeHint'),
            h(
              'div.segmented',
              THEMES.map((theme) =>
                h(
                  `button.segmented__item${settings.theme === theme.key ? '.is-active' : ''}`,
                  { type: 'button', onclick: () => update({ theme: theme.key }) },
                  t(theme.labelKey)
                )
              )
            )
          ),
        ]),

        card(t('settings.startup'), t('settings.startupHint'), [
          switchRow(t('settings.startWithWindows'), settings.autostart, (v) => update({ autostart: v }), {
            hint: t('settings.lasUnidadesEstaranDisponibles'),
          }),
          switchRow(
            t('settings.startInBackground'),
            settings.startMinimized,
            (v) => update({ startMinimized: v }),
            { hint: t('settings.sinAbrirLaVentana') }
          ),
          switchRow(
            t('settings.mountOnOpen'),
            settings.mountOnStart,
            (v) => update({ mountOnStart: v })
          ),
          switchRow(
            t('settings.closeToTray'),
            settings.closeToTray,
            (v) => update({ closeToTray: v }),
            {
              hint:
                t('settings.recomendadoLasUnidadesSiguen'),
            }
          ),
          switchRow(
            t('settings.confirmUnmount'),
            settings.confirmUnmount,
            (v) => update({ confirmUnmount: v })
          ),
        ]),

        keysCard(),
        cacheCard(),
        updatesCard(settings, info),
        componentsCard(),
        maintenanceCard(info),
        aboutCard(info),
      ]),
    ]);
  }

  /* ---------------------------------------------------------- updates */

  // Repainted in place from the update:state events, so a download started
  // from the notice shows its progress here too.
  let updatesBody = null;

  function updatesCard(settings, info) {
    updatesBody = h('div.settings-group', updateRows(settings, info));
    return h('div.card', [
      h('div.card__head', [
        h('div', [
          h('div.card__title', t('settings.updates')),
          h('div.card__desc', t('settings.updatesHint')),
        ]),
      ]),
      h('div.card__body', updatesBody),
    ]);
  }

  function updateRows(settings, info) {
    const state = app().state.update || { status: 'idle' };

    return [
      setting(t('settings.updateStatus'), statusHint(state, info), checkControl(state)),
      switchRow(
        t('settings.updateNotify'),
        settings.updateNotify !== false,
        (v) => update({ updateNotify: v }),
        { hint: t('settings.updateNotifyHint') }
      ),
      // Only worth showing when there is one, and then it needs a way back:
      // a version dismissed for good is otherwise unreachable.
      settings.updateSkipVersion
        ? setting(
            t('settings.updateSkipped'),
            t('settings.updateSkippedHint', { version: settings.updateSkipVersion }),
            h(
              'button.btn.btn--ghost.btn--sm',
              { type: 'button', onclick: () => update({ updateSkipVersion: '' }) },
              t('settings.updateUnskip')
            )
          )
        : null,
    ].filter(Boolean);
  }

  function statusHint(state, info) {
    const current = (info && info.version) || '—';
    switch (state.status) {
      case 'checking':
        return t('update.checking');
      case 'available':
        return t('update.foundVersion', { version: state.info ? state.info.version : '' });
      case 'downloading':
        return t('update.progressPlain', {
          percent: Math.round((state.progress && state.progress.percent) || 0),
        });
      case 'ready':
        return t('update.readyToInstall', { version: state.info ? state.info.version : '' });
      case 'installing':
        return t('update.installing');
      case 'current':
        return t('update.upToDate', { version: current });
      case 'error':
        return t('update.failed');
      case 'disabled':
        // Running from source, where there is no installer to replace.
        return t('update.notPackaged');
      default:
        return t('update.neverChecked', { version: current });
    }
  }

  function checkControl(state) {
    if (state.status === 'ready') {
      return h(
        'button.btn.btn--primary.btn--sm',
        { type: 'button', onclick: () => app().call(app().api.update.install(), { silent: true }) },
        [icon('power', 14, 'btn__icon'), h('span', t('update.restartAndInstall'))]
      );
    }
    if (state.status === 'available') {
      return h(
        'button.btn.btn--primary.btn--sm',
        { type: 'button', onclick: () => app().call(app().api.update.download(), { silent: true }) },
        [icon('download', 14, 'btn__icon'), h('span', t('update.updateNow'))]
      );
    }
    const busy = state.status === 'checking' || state.status === 'downloading';
    return h(
      'button.btn.btn--outline.btn--sm',
      {
        type: 'button',
        disabled: busy ? '' : undefined,
        onclick: (e) =>
          withBusy(e.currentTarget, () => app().call(app().api.update.check(), { silent: true })),
      },
      [icon('refresh', 14, 'btn__icon'), h('span', t('update.checkNow'))]
    );
  }

  /** Called by the application when an update:state event arrives. */
  function onUpdateState() {
    if (!updatesBody || !updatesBody.isConnected) return;
    OM.dom.mount(updatesBody, updateRows(app().state.settings, app().state.appInfo));
  }

  /* ------------------------------------------------------------ cache */

  // Filled by loadCache() and repainted in place, so opening Settings does
  // not block on walking the cache folder.
  let cacheState = null;

  // The order the profiles are offered in: fastest first, because that is
  // what the drive ships with, then down to the one that leaves least behind.
  const PROFILE_ORDER = ['performance', 'balanced', 'lowfootprint', 'custom'];

  // The custom editor's fields, in the order they are shown. `kind` picks the
  // control; the label and the hint come from the catalogue.
  const TUNING_FIELDS = [
    { key: 'cacheMode', kind: 'mode' },
    { key: 'retentionDays', kind: 'number' },
    { key: 'readChunkStreams', kind: 'number' },
    { key: 'readChunkSizeMB', kind: 'number' },
    { key: 'readAheadMB', kind: 'number' },
    { key: 'dirCacheSeconds', kind: 'number' },
    { key: 'transfers', kind: 'number' },
    { key: 'checkers', kind: 'number' },
    { key: 'writeBackSeconds', kind: 'number' },
    { key: 'handleCachingSeconds', kind: 'number' },
    { key: 'fastFingerprint', kind: 'switch' },
  ];

  function cacheCard() {
    const body = h('div.settings-group');
    paintCache(body);
    loadCache(body);
    return h('div.card', [
      h('div.card__head', [
        h('div', [
          h('div.card__title', t('cache.title')),
          h('div.card__desc', t('cache.description')),
        ]),
      ]),
      h('div.card__body', body),
    ]);
  }

  async function loadCache(body) {
    cacheState = await app().call(app().api.cache.state(), { silent: true });
    paintCache(body);
  }

  function paintCache(body) {
    if (!cacheState) {
      OM.dom.mount(body, [h('div.setting__hint', t('cache.reading'))]);
      return;
    }

    const fmt = global.OM.fmt;
    const volume = cacheState.volume;
    const automatic = cacheState.limitGB <= 0;


    // What it is doing right now, in one line, before any control. The
    // numbers are the point: a cache setting with no figures beside it is
    // just a box to guess at.
    const where = volume
      ? t('cache.onVolume', {
          letter: volume.letter,
          label: volume.label || volume.filesystem,
          free: fmt.bytes(volume.free),
        })
      : cacheState.root;

    const rows = [
      setting(
        t('cache.location'),
        where,
        h('div.row', { style: { gap: 'var(--sp-2)' } }, [
          h(
            'button.btn.btn--ghost.btn--sm',
            { type: 'button', onclick: () => chooseLocation(body) },
            [icon('folder', 14, 'btn__icon'), h('span', t('cache.change'))]
          ),
          cacheState.location
            ? h(
                'button.btn.btn--ghost.btn--sm',
                { type: 'button', onclick: () => setLocation(body, '') },
                t('cache.useDefault')
              )
            : null,
        ])
      ),

      setting(
        t('cache.size'),
        automatic
          ? t('cache.sizeAutoHint', { reserve: cacheState.reserveGB })
          : t('cache.sizeFixedHint', { limit: cacheState.limitGB, reserve: cacheState.reserveGB }),
        h('div.row', { style: { gap: 'var(--sp-2)', alignItems: 'center' } }, [
          h(
            'div.segmented',
            [
              h(
                `button.segmented__item${automatic ? '.is-active' : ''}`,
                { type: 'button', onclick: () => setLimit(body, 0) },
                t('cache.automatic')
              ),
              h(
                `button.segmented__item${automatic ? '' : '.is-active'}`,
                { type: 'button', onclick: () => setLimit(body, cacheState.limitGB || 20) },
                t('cache.fixed')
              ),
            ]
          ),
          automatic
            ? null
            : h('input.input', {
                type: 'number',
                min: '1',
                step: '1',
                value: cacheState.limitGB,
                style: { width: '92px' },
                onchange: (e) => setLimit(body, Number(e.target.value)),
              }),
          automatic ? null : h('span.setting__hint', 'GB'),
        ])
      ),

      // The profile. One choice instead of eleven, because the figures trade
      // against each other and someone asked to set them one at a time has
      // no way to know which combinations make sense together.
      setting(
        t('cache.profile'),
        t('cache.profileHint.' + cacheState.profile),
        h(
          'select.select',
          {
            style: { width: '210px' },
            onchange: (e) => setProfile(body, e.target.value),
          },
          PROFILE_ORDER.map((id) =>
            h(
              'option',
              { value: id, selected: id === cacheState.profile },
              t('cache.profileName.' + id)
            )
          )
        )
      ),

      // What the chosen profile actually resolves to. A named profile with no
      // figures beside it is a promise the user cannot check.
      cacheState.profile === 'custom' ? null : tuningSummary(),

      cacheState.profile === 'custom' ? customEditor(body) : null,

      setting(
        t('cache.used'),
        t('cache.usedHint'),
        h('div.row', { style: { gap: 'var(--sp-3)', alignItems: 'center' } }, [
          h('strong', fmt.bytes(cacheState.usage.total)),
          h(
            'button.btn.btn--ghost.btn--sm',
            { type: 'button', onclick: () => clearCache(body) },
            [icon('trash', 14, 'btn__icon'), h('span', t('cache.clear'))]
          ),
        ])
      ),
    ];

    OM.dom.mount(body, rows.filter(Boolean));
  }

  async function chooseLocation(body) {
    const picked = await app().call(app().api.cache.choose(t('cache.chooseTitle')), { silent: true });
    if (!picked || picked.cancelled) return;
    await setLocation(body, picked.path);
  }

  async function setLocation(body, target) {
    const result = await app().call(app().api.cache.setLocation(target), {});
    if (!result) return;
    toast.ok(target ? t('cache.moved') : t('cache.movedDefault'));
    // Existing drives keep using the old folder until they are remounted:
    // rclone is told the cache directory once, when it starts.
    if (app().state.mounts.some((m) => app().statusOf(m.id).state === 'mounted')) {
      toast.warn(t('cache.remountNeeded'));
    }
    await loadCache(body);
  }

  async function setLimit(body, gb) {
    const result = await app().call(app().api.cache.setLimit(gb), { silent: true });
    if (!result) return;
    cacheState.limitGB = result.limitGB;
    paintCache(body);
  }

  /** The resolved figures, read-only, beneath a named profile. */
  function tuningSummary() {
    const tuning = cacheState.tuning;
    const parts = [
      t('cache.sumMode', { mode: tuning.cacheMode }),
      tuning.retentionDays > 0
        ? t('cache.sumKeptDays', { days: tuning.retentionDays })
        : t('cache.sumKeptForever'),
      tuning.readChunkStreams > 0
        ? t('cache.sumStreams', { streams: tuning.readChunkStreams, size: tuning.readChunkSizeMB })
        : t('cache.sumStreamsOff', { size: tuning.readChunkSizeMB }),
      tuning.cacheMode === 'full' && tuning.readAheadMB > 0
        ? t('cache.sumReadAhead', { mb: tuning.readAheadMB })
        : null,
      t('cache.sumTransfers', { transfers: tuning.transfers }),
      t('cache.sumListings', { seconds: tuning.dirCacheSeconds }),
    ].filter(Boolean);

    return h('div.setting__hint', parts.join(' \u00b7 '));
  }

  /** Every figure, editable, for the custom profile. */
  function customEditor(body) {
    const tuning = cacheState.tuning;
    const limits = cacheState.limits || {};

    return h(
      'div.settings-group',
      TUNING_FIELDS.map((field) => {
        const label = t('cache.field.' + field.key);
        const hint = t('cache.fieldHint.' + field.key);

        if (field.kind === 'switch') {
          return switchRow(label, tuning[field.key], (value) => editCustom(body, field.key, value), {
            hint,
          });
        }

        if (field.kind === 'mode') {
          return setting(
            label,
            hint,
            h(
              'select.select',
              {
                // Wide enough for "full (reads and writes)" without clipping.
                style: { width: '210px' },
                onchange: (e) => editCustom(body, field.key, e.target.value),
              },
              ['full', 'writes'].map((mode) =>
                h(
                  'option',
                  { value: mode, selected: mode === tuning[field.key] },
                  t('cache.mode.' + mode)
                )
              )
            )
          );
        }

        const range = limits[field.key] || [0, 9999];
        return setting(
          label,
          hint,
          h('input.input', {
            type: 'number',
            min: String(range[0]),
            max: String(range[1]),
            step: '1',
            value: tuning[field.key],
            style: { width: '110px' },
            onchange: (e) => editCustom(body, field.key, Number(e.target.value)),
          })
        );
      })
    );
  }

  async function setProfile(body, profile) {
    const result = await app().call(app().api.cache.setProfile({ profile }), { silent: true });
    if (!result) return;
    cacheState.profile = result.id;
    cacheState.tuning = result.tuning;
    paintCache(body);
    warnRemount();
  }

  async function editCustom(body, key, value) {
    const next = { ...cacheState.tuning, [key]: value };
    const result = await app().call(
      app().api.cache.setProfile({ profile: 'custom', tuning: next }),
      { silent: true }
    );
    if (!result) return;
    cacheState.profile = result.id;
    cacheState.tuning = result.tuning;
    paintCache(body);
    warnRemount();
  }

  // rclone is handed these figures once, when it starts, so a drive already
  // running keeps the old ones until it is mounted again.
  function warnRemount() {
    if (app().state.mounts.some((m) => app().statusOf(m.id).state === 'mounted')) {
      toast.warn(t('cache.remountNeeded'));
    }
  }

  async function clearCache(body) {
    const ok = await modal.confirm({
      title: t('cache.clearTitle'),
      message: t('cache.clearMessage'),
      confirmLabel: t('cache.clear'),
    });
    if (!ok) return;

    const result = await app().call(app().api.cache.clear(), {});
    if (!result) return;

    // Nothing is thrown away silently: a drive left alone is named, with the
    // reason, because "cleared" over a cache that is still full is worse
    // than no message at all.
    for (const skip of result.skipped) {
      if (skip.reason === 'pending') {
        toast.warn(t('cache.skippedPending', { name: skip.name, count: skip.pending }));
      } else {
        toast.warn(t('cache.skippedMounted', { name: skip.name }));
      }
    }
    if (result.cleared.length) toast.ok(t('cache.cleared', { count: result.cleared.length }));
    else if (!result.skipped.length) toast.ok(t('cache.alreadyEmpty'));

    await loadCache(body);
  }

  /* ----------------------------------------------------------- claves */

  function keysCard() {
    const keys = app().state.connections.filter((c) => c.hasSecret);

    return card(
      t('settings.keys'),
      t('settings.keysHint'),
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
                    h('span.badge.badge--neutral', serverName(conn)),
                  ]),
                  h(
                    'div.setting__hint',
                    usedBy.length
                      ? `En uso por ${usedBy.map((m) => `${m.driveLetter}:`).join(', ')}`
                      : t('settings.noDrivesUsing')
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
                    'data-tip': t('settings.eliminar'),
                    onclick: () => removeKey(conn, usedBy),
                  },
                  icon('trash', 15)
                ),
              ]),
            ]);
          })
        : [
            h('p.muted', { style: { fontSize: 'var(--fs-sm)' } },
              t('settings.noKeys')),
          ]
    );
  }

  async function replaceKey(conn, button) {
    const secret = await modal.prompt({
      title: t('settings.cambiarLaSecretKey'),
      description: `Para la Access Key ${conn.accessKeyId}.`,
      label: t('settings.nuevaSecretKey'),
      placeholder: t('settings.secretKey'),
    });
    if (!secret) return;

    await withBusy(button, async () => {
      const saved = await app().call(
        app().api.connections.save({ ...conn, secretAccessKey: secret })
      );
      if (!saved) return;
      await app().loadConnections();
      app().renderView();
      toast.ok(t('settings.keyUpdated'));
    });
  }

  async function removeKey(conn, usedBy) {
    if (usedBy.length) {
      toast.warn(
        `La usan las unidades ${usedBy.map((m) => `${m.driveLetter}:`).join(', ')}. Elimínalas primero.`,
        t('settings.keyInUse')
      );
      return;
    }
    const confirmed = await modal.confirm({
      title: t('settings.eliminarEstasClaves'),
      message: `Se borrará la Access Key ${conn.accessKeyId} de este equipo.`,
      detail: t('settings.noAfectaALos'),
      confirmLabel: t('settings.eliminar'),
      danger: true,
    });
    if (!confirmed) return;

    const done = await app().call(app().api.connections.remove(conn.id));
    if (!done) return;
    await app().loadConnections();
    app().renderView();
    toast.ok(t('settings.keysRemoved'));
  }

  /** Host a stored credential belongs to. */
  function serverName(conn) {
    return String(conn.endpoint || '').replace(/^https?:[/][/]/, '') || '—';
  }

  /* ------------------------------------------------------- componentes */

  function componentsCard() {
    const deps = app().state.deps;
    const ready = deps && deps.ready;

    return card(
      t('settings.components'),
      t('settings.componentsHint'),
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
              h('div.setting__label', ready ? t('settings.allInstalled') : t('settings.componentMissing')),
              h(
                'div.setting__hint',
                deps
                  ? [
                      deps.rclone.installed
                        ? t('settings.engineVersion', { version: deps.rclone.version })
                        : t('settings.engineMissing'),
                      ' · ',
                      deps.winfsp.installed
                        ? t('settings.driverVersion', { version: deps.winfsp.version })
                        : t('settings.driverMissing'),
                    ]
                  : t('settings.checking')
              ),
            ]),
          ]),
          h('div.setting__control', [
            h(
              'button.btn.btn--outline.btn--sm',
              { type: 'button', onclick: (e) => recheck(e.currentTarget) },
              ready ? t('settings.check') : t('settings.installNow')
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
        toast.ok(t('settings.allInstalledToast'));
        return;
      }
      // Falta algo: se instala sin más preguntas, igual que en el primer
      // arranque.
      const ok = await global.OM.app.runSetup();
      await app().loadDeps();
      app().renderView();
      if (ok) toast.ok(t('settings.installedToast'));
    });
  }

  /* ------------------------------------------------------ mantenimiento */

  // Aquí sólo hay sitios a los que ir, no valores que escribir. El endpoint y
  // los parámetros del motor no se exponen a propósito: son el servicio, no
  // una preferencia, y teclear algo distinto sólo rompe todas las unidades.
  function maintenanceCard(info) {
    return card(t('settings.maintenance'), t('settings.maintenanceHint'), [
      linkRow(
        t('settings.dataFolder'),
        t('settings.dataFolderHint'),
        'folder',
        () => app().call(app().api.app.openPath(info.userData))
      ),
      linkRow(
        t('cache.title'),
        t('settings.cacheFolderHint'),
        'package',
        () => app().call(app().api.app.openPath(info.cacheDir))
      ),
      linkRow(
        t('settings.appLog'),
        t('settings.appLogHint'),
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
        h('button.btn.btn--outline.btn--sm', { type: 'button', onclick: handler }, t('settings.abrir')),
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
            h('div.card__desc', `${t('settings.version')} ${info.version || '—'}`),
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
          h('dt', t('settings.version')),
          h('dd', info.version || '—'),
          h('dt', t('settings.connections')),
          h('dd', (info.regions || []).map((r) => `${r.name}: ${r.endpoint}`).join('  ·  ') || '—'),
          h('dt', t('settings.motorDeTransferencia')),
          h('dd', info.rcloneVersion ? `rclone ${info.rcloneVersion}` : 'no instalado'),
          h('dt', t('settings.plataforma')),
          h('dd', `Electron ${info.electron || '—'} · ${info.platform || ''}`),
          h('dt', t('settings.cifradoDeCredenciales')),
          h('dd', info.encryptionAvailable ? t('settings.dpapi') : 'no disponible'),
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
  global.OM.views.settings = { render, onUpdateState };
})(window);

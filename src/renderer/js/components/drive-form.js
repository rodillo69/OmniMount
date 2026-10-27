'use strict';

/**
 * The new-drive dialog.
 *
 * Two steps, because the fields cannot exist before the storage type is
 * known: pick what you are connecting to, then fill in what that type needs.
 * The second step is generated from rclone's own description of the backend,
 * so this file contains no field names for any particular protocol.
 */

window.OM = window.OM || {};

OM.driveForm = (() => {
  const { h, field, clear } = OM.dom;
  const fields = OM.backendFields;

  function app() {
    return window.OM.app;
  }

  async function open(options) {
    const opts = options || {};
    const editing = opts.editId ? app().state.mounts.find((m) => m.id === opts.editId) : null;

    const catalogue = await app().call(app().api.backends.list(), { silent: true });
    const types = (catalogue && catalogue.types) || [];
    if (!types.length) {
      return OM.toast.error(t('form.noTypes'));
    }

    const stored = await app().call(app().api.setup.credentials(), { silent: true });
    const saved = (stored && stored.saved) || [];

    const editedConn = editing ? app().connectionOf(editing.connectionId) : null;

    const state = {
      // Editing never changes the type: a different protocol is a different
      // drive, not an edit of this one.
      type: editedConn ? editedConn.type : null,
      values: {},
      root: editing ? editing.root || editing.bucket || '' : '',
      prefix: editing ? editing.prefix : '',
      name: editing ? editing.name : '',
      driveLetter: editing ? editing.driveLetter : '',
      readOnly: editing ? editing.readOnly : false,
      autoMount: editing ? editing.autoMount : true,
      connectionId: editing ? editing.connectionId : null,
      // Set once a drive has been saved but not mounted, so a retry edits it
      // instead of creating a duplicate.
      savedId: null,
      reuseConnection: false,
      showAdvanced: false,
      search: '',
      presetId: '',
      regionId: '',
      letters: [],
      busy: false,
      error: null,
    };

    if (editedConn) {
      state.values = { ...(editedConn.config || {}) };
      state.reuseConnection = true;
    }

    const body = h('div.driveform');
    const footer = h('div.modal__actions');

    const modal = OM.modal.open({
      title: editing ? t('form.editTitle') : t('form.newTitle'),
      description: editing ? t('form.editDesc') : t('form.newDesc'),
      body,
      footer,
      wide: true,
      dismissable: !state.busy,
    });

    const freeLetters = await app().call(app().api.drives.free(), { silent: true });
    state.letters = (freeLetters || []).slice();
    if (!state.driveLetter) state.driveLetter = state.letters[0] || '';

    function backend() {
      return types.find((item) => item.name === state.type) || null;
    }

    function setValue(name, value) {
      state.values[name] = value;
    }

    /**
     * Fields a preset controls, hidden from the form.
     *
     * Showing an endpoint box that the region selector overwrites invites
     * someone to edit it and wonder why their value disappears.
     */
    function hiddenByPreset() {
      if (!state.presetId) return [];
      const b = backend();
      const preset = (b.presets || []).find((p) => p.id === state.presetId);
      if (!preset) return [];
      const names = Object.keys(preset.config || {});
      if (preset.regions.length) names.push('endpoint');
      return names;
    }

    /** Fields the provider dropdown governs, so they never appear twice. */
    function governedFields() {
      const b = backend();
      const names = b.fields.some((f) => f.name === 'provider') ? ['provider'] : [];
      return names.concat(hiddenByPreset());
    }

    /**
     * Apply whichever provider was chosen.
     *
     * A `preset:` value is one of ours and carries addresses; anything else
     * is a value rclone understands for its own `provider` option.
     */
    function chooseProvider(value) {
      const b = backend();
      if (!b) return;

      if (!value.startsWith('preset:')) {
        state.presetId = '';
        state.regionId = '';
        state.values.provider = value;
        return;
      }

      const preset = (b.presets || []).find((p) => `preset:${p.id}` === value);
      if (!preset) return;

      state.presetId = preset.id;
      state.regionId = '';
      Object.assign(state.values, preset.config);
      if (preset.regions.length) applyRegion(preset, preset.regions[0].id);
    }

    function applyRegion(preset, regionId) {
      const region = preset.regions.find((r) => r.id === regionId) || preset.regions[0];
      if (!region) return;
      state.regionId = region.id;
      state.values.endpoint = region.endpoint;
      if (region.region) state.values.region = region.region;
    }

    /* ------------------------------------------------------- step one */

    /**
     * A backend's display name.
     *
     * The common ones have a translated name; the rest keep the vendor name
     * rclone reports, which is a proper noun and the same in any language.
     */
    function labelOf(item) {
      const key = `backend.${item.name}`;
      const translated = t(key);
      return translated === key ? item.label : translated;
    }

    /** Match a backend against the search box, by label, id or description. */
    function matchesQuery(item, query) {
      if (!query) return true;
      return (
        labelOf(item).toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    function typePicker() {
      const query = state.search.trim().toLowerCase();

      const matches = types.filter((item) => matchesQuery(item, query));

      const card = (item) =>
        h(
          'button.backend-card',
          {
            type: 'button',
            title: item.description,
            onclick: () => {
              state.type = item.name;
              state.values = fields.initial(item);
              state.error = null;
              paint();
            },
          },
          [
            h('span.backend-card__name', labelOf(item)),
            item.description ? h('span.backend-card__desc', item.description) : null,
          ]
        );

      const search = h('input.input.backend-search', {
        type: 'search',
        value: state.search,
        placeholder: t('form.search', { count: types.length }),
        spellcheck: 'false',
        'data-autofocus': 'true',
        oninput: (e) => {
          state.search = e.target.value;
          // Repaint only the grid: rebuilding the input would lose the caret.
          paintGrid();
        },
      });

      const grid = h('div.backend-grid');

      function paintGrid() {
        const q = state.search.trim().toLowerCase();
        const list = types.filter((item) => matchesQuery(item, q));
        clear(grid);
        if (!list.length) {
          grid.appendChild(h('p.backend-none', t('form.noMatch', { query: state.search })));
          return;
        }
        for (const item of list) grid.appendChild(card(item));
      }

      for (const item of matches) grid.appendChild(card(item));

      return h('div.backend-pick', [search, h('div.backend-scroll', grid)]);
    }

    /* ------------------------------------------------------- step two */

    function detailForm() {
      const b = backend();
      const rootSpec = b.root;

      const rows = [];

      // Which server and how to sign in, generated from rclone's own options.
      if (state.reuseConnection && editedConn) {
        rows.push(
          h('div.saved-creds', [
            h('div.saved-creds__mark', OM.icons.icon('key', 16)),
            h('div.saved-creds__text', [
              h('div.saved-creds__title', t('form.savedConnection')),
              h('div.saved-creds__sub', editedConn.name),
            ]),
          ])
        );
      } else {
        // One provider list, not two. Services with known addresses sit in
        // the same dropdown as the ones rclone names, because to the person
        // filling the form they are the same kind of answer: "who hosts my
        // storage". Choosing one with known addresses fills the endpoint;
        // choosing any other just sets rclone's dialect and asks for a URL.
        const providerSpec = b.fields.find((f) => f.name === 'provider');
        if ((b.presets || []).length || providerSpec) {
          const options = [
            ...(b.presets || []).map((p) => ({ value: `preset:${p.id}`, label: p.label })),
            ...((providerSpec && providerSpec.options) || []).map((o) => ({
              value: o.value,
              label: o.label,
            })),
          ];

          const selected = state.presetId
            ? `preset:${state.presetId}`
            : state.values.provider || '';

          const providerSelect = h(
            'select.select',
            {
              onchange: (e) => {
                chooseProvider(e.target.value);
                paint();
              },
            },
            [
              h('option', { value: '' }, t('form.providerPick')),
              ...options.map((o) => h('option', { value: o.value }, o.label)),
            ]
          );
          // Set the value on the element rather than marking an <option>:
          // with a value that matches nothing the browser falls back to the
          // first entry, which silently pre-selects a provider nobody chose.
          providerSelect.value = options.some((o) => o.value === selected) ? selected : '';

          rows.push(
            field(t('form.provider'), providerSelect, {
              required: true,
              hint: t('form.providerHint'),
            })
          );

          const preset = (b.presets || []).find((p) => p.id === state.presetId);
          if (preset && preset.regions.length) {
            rows.push(
              field(
                t('form.region'),
                h(
                  'select.select',
                  {
                    onchange: (e) => {
                      applyRegion(preset, e.target.value);
                      paint();
                    },
                  },
                  preset.regions.map((r) =>
                    h('option', { value: r.id, selected: r.id === state.regionId }, r.label)
                  )
                ),
                { required: true, hint: t('form.regionHint') }
              )
            );
          }
        }

        rows.push(...fields.render(b, state.values, setValue, { skip: governedFields() }));
      }

      // The container that becomes the root of the drive.
      if (rootSpec) {
        rows.push(
          field(
            rootSpec.label,
            h('input.input', {
              type: 'text',
              value: state.root,
              placeholder: rootSpec.placeholder,
              spellcheck: 'false',
              disabled: Boolean(editing),
              oninput: (e) => {
                state.root = e.target.value.trim();
              },
            }),
            {
              required: rootSpec.required,
              hint:
                rootSpec.kind === 'path'
                  ? t('form.rootHintPath')
                  : t('form.rootHintContainer'),
            }
          )
        );
      }

      rows.push(
        field(
          t('form.driveLetter'),
          h(
            'select.select',
            {
              onchange: (e) => {
                state.driveLetter = e.target.value;
              },
            },
            state.letters.map((l) =>
              h('option', { value: l, selected: l === state.driveLetter }, `${l}:`)
            )
          ),
          { required: true, hint: t('form.driveLetterHint') }
        )
      );

      // Advanced options exist for every backend and are genuinely advanced,
      // so they stay folded away.
      // Count only what actually applies to the chosen provider, or the
      // disclosure promises options that are not there when opened.
      const provider = state.values.provider || '';
      const adv = fields.advanced(b).filter((f) => fields.appliesTo(f, provider));
      if (adv.length) {
        rows.push(
          h('details.moreopts', [
            h('summary', t('form.moreOptions', { count: adv.length })),
            h('div.moreopts__body', fields.render(b, state.values, setValue, { advanced: true })),
          ])
        );
      }

      return h('div.driveform__fields', rows);
    }

    /* ---------------------------------------------------------- submit */

    async function submit() {
      const b = backend();
      state.error = null;

      if (!state.reuseConnection) {
        const gaps = fields.missing(b, state.values, governedFields());
        if (gaps.length) {
          state.error = t('form.required', { fields: gaps.join(', ') });
          return paint();
        }
      }

      if (b.root && b.root.required && !state.root) {
        state.error = t('form.rootRequired', { label: b.root.label });
        return paint();
      }

      state.busy = true;
      paint();

      // throwOnError rather than the default: the message belongs inside the
      // form, next to the field that caused it, not in a toast that covers it.
      let result;
      try {
        result = await app().call(
          app().api.setup.createDrive({
            // state.savedId carries a drive that was saved but failed to
            // mount: without it, correcting a field and submitting again
            // would leave the broken drive behind and create a second one.
            id: editing ? editing.id : state.savedId || undefined,
            type: state.type,
            config: state.reuseConnection ? {} : state.values,
            connectionId: state.reuseConnection ? state.connectionId : null,
            root: state.root,
            prefix: state.prefix,
            name: state.name,
            driveLetter: state.driveLetter,
            readOnly: state.readOnly,
            autoMount: state.autoMount,
          }),
          { silent: true, throwOnError: true }
        );
      } catch (err) {
        state.busy = false;
        state.error = err.message;
        return paint();
      }

      state.busy = false;

      // The drive is only finished when it is mounted. Credentials that read
      // correctly are not the same thing: the driver may not be loaded, or
      // Windows may refuse to publish the letter. Closing with "drive
      // created" on the strength of the credentials alone would be telling
      // the user something nobody has checked.
      if (result && result.mountOk === false) {
        state.savedId = result.id;
        state.error = t('form.savedNotMounted', { error: result.mountError });
        // The dashboard shows the saved drive in its error state, so the
        // failure is visible there too and not only in this form.
        await app().reloadAll();
        app().refreshChrome();
        return paint();
      }

      modal.close();
      if (result && result.mountOk) {
        OM.toast.success(t('form.mounted', { letter: result.driveLetter }));
      } else {
        OM.toast.success(editing ? t('form.updated') : t('form.created'));
      }
      if (opts.onDone) opts.onDone(result);
    }

    /* ----------------------------------------------------------- paint */

    function paint() {
      clear(body);
      clear(footer);

      if (!state.type) {
        body.appendChild(typePicker());
        footer.appendChild(
          h('button.btn.btn--ghost', { type: 'button', onclick: () => modal.close() }, t('action.cancel'))
        );
        return;
      }

      const b = backend();

      body.appendChild(
        h('div.driveform__chosen', [
          h('span.driveform__chosen-label', labelOf(b)),
          editing
            ? null
            : h(
                'button.btn.btn--link',
                {
                  type: 'button',
                  onclick: () => {
                    state.type = null;
                    state.error = null;
                    paint();
                  },
                },
                t('action.change')
              ),
        ])
      );

      body.appendChild(detailForm());

      if (state.error) {
        body.appendChild(h('div.formerror', [OM.icons.icon('alert', 16), state.error]));
      }

      footer.appendChild(
        h(
          'button.btn.btn--ghost',
          { type: 'button', disabled: state.busy, onclick: () => modal.close() },
          t('action.cancel')
        )
      );
      footer.appendChild(
        h(
          'button.btn.btn--primary',
          { type: 'button', disabled: state.busy, onclick: submit },
          state.busy
            ? [h('span.spinner'), editing ? t('action.saving') : t('action.creating')]
            : [OM.icons.icon('plus', 16), editing ? t('action.save') : t('action.create')]
        )
      );
    }

    paint();
    return modal;
  }

  return { open };
})();

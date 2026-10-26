/* OmniMount - alta y edición de una unidad.
   Lo normal es rellenar bucket y claves; todo lo demás tiene un valor por
   defecto que funciona y vive detrás de "Más opciones". */
(function (global) {
  'use strict';

  const { h, mount, field, switchRow, withBusy } = global.OM.dom;
  const { icon } = global.OM.icons;
  const toast = global.OM.toast;
  const modal = global.OM.modal;

  function app() {
    return global.OM.app;
  }

  async function open(options) {
    const opts = options || {};
    const editing = opts.editId ? app().state.mounts.find((m) => m.id === opts.editId) : null;

    const info = await app().call(app().api.setup.credentials(), { silent: true });
    const storedKeys = (info && info.saved) || [];

    // When editing, the server is fixed: pointing the same drive at another
    // endpoint would mean other credentials and another bucket, which is a
    // different drive altogether.
    const editedConn = editing ? app().connectionOf(editing.connectionId) : null;

    const data = {
      id: editing ? editing.id : undefined,
      endpoint: editedConn ? editedConn.endpoint : (storedKeys[0] ? storedKeys[0].endpoint : ''),
      bucket: editing ? editing.bucket : '',
      driveLetter: editing ? editing.driveLetter : '',
      name: editing ? editing.name : '',
      prefix: editing ? editing.prefix : '',
      readOnly: editing ? editing.readOnly : false,
      autoMount: editing ? editing.autoMount : true,
      connectionId: editing ? editing.connectionId : null,
      accessKeyId: '',
      secretAccessKey: '',
      newCredentials: false,
    };

    /** Credentials already stored for the endpoint being typed. */
    function savedKeys() {
      const target = (data.endpoint || '').trim().replace(/\/+$/, '').toLowerCase();
      if (!target) return [];
      return storedKeys.filter((c) => (c.endpoint || '').toLowerCase() === target);
    }

    /** Offer stored credentials when the endpoint changes, ask when there are none. */
    function syncCredentials() {
      const keys = savedKeys();
      if (keys.length) {
        if (!keys.some((k) => k.id === data.connectionId)) data.connectionId = keys[0].id;
        data.newCredentials = false;
      } else {
        data.connectionId = null;
        data.newCredentials = true;
      }
    }
    if (!editing) syncCredentials();

    const letters = (await app().call(app().api.drives.free(), { silent: true })) || [];
    if (!data.driveLetter) {
      data.driveLetter =
        (await app().call(app().api.drives.suggest(['S', 'T', 'U', 'V', 'W', 'Y', 'Z']), {
          silent: true,
        })) || letters[letters.length - 1] || '';
    }

    const errorSlot = h('div');
    const body = h('div.stack.stack--lg');

    function paint() {
      const letterOptions = [...new Set([data.driveLetter, ...letters].filter(Boolean))].sort();
      const keys = savedKeys();
      const currentKey = keys[0];

      mount(body, [
        errorSlot,

        // The endpoint comes first: it decides which stored credentials
        // apply and where the bucket is looked up.
        field(
          'Endpoint',
          h('input.input.input--mono', {
            type: 'text',
            value: data.endpoint,
            placeholder: 'https://s3.example.com',
            disabled: Boolean(editing),
            spellcheck: 'false',
            list: storedKeys.length ? 'known-endpoints' : null,
            oninput: (e) => {
              data.endpoint = e.target.value.trim();
            },
            onchange: () => {
              syncCredentials();
              paint();
            },
          }),
          {
            required: true,
            hint: editing
              ? 'Fixed for an existing drive: another server means another drive.'
              : 'Address of the storage service. Any S3-compatible endpoint works.',
          }
        ),

        storedKeys.length
          ? h(
              'datalist#known-endpoints',
              [...new Set(storedKeys.map((c) => c.endpoint))].map((e) => h('option', { value: e }))
            )
          : null,

        field(
          'Nombre del bucket',
          h('input.input', {
            type: 'text',
            value: data.bucket,
            placeholder: 'mi-bucket',
            'data-autofocus': '',
            spellcheck: 'false',
            oninput: (e) => {
              data.bucket = e.target.value.trim();
            },
          }),
          { required: true, hint: 'Tal y como se llama en el almacenamiento remoto.' }
        ),

        data.newCredentials ? credentialFields(data) : savedCredentials(currentKey),

        field(
          'Letra de la unidad',
          h(
            'select.select',
            {
              onchange: (e) => {
                data.driveLetter = e.target.value;
              },
            },
            letterOptions.length
              ? letterOptions.map((letter) =>
                  h(
                    'option',
                    { value: letter, selected: letter === data.driveLetter },
                    `${letter}:`
                  )
                )
              : [h('option', { value: '' }, 'No hay letras libres')]
          ),
          { hint: 'Con la que aparecerá en el Explorador de Windows.' }
        ),

        moreOptions(data),
      ]);
    }

    function credentialFields(target) {
      const secretInput = h('input.input.input--mono', {
        type: 'password',
        value: target.secretAccessKey,
        placeholder: 'Secret Key',
        autocomplete: 'off',
        oninput: (e) => {
          target.secretAccessKey = e.target.value;
        },
      });

      return h('div.stack.stack--lg', [
        h('div.form-row', [
          field(
            'Access Key',
            h('input.input.input--mono', {
              type: 'text',
              value: target.accessKeyId,
              placeholder: 'Access Key',
              autocomplete: 'off',
              spellcheck: 'false',
              oninput: (e) => {
                target.accessKeyId = e.target.value.trim();
              },
            }),
            { required: true }
          ),
          field(
            'Secret Key',
            h('div.input-affix', [
              secretInput,
              h(
                'button.input-affix__btn',
                {
                  type: 'button',
                  title: 'Mostrar u ocultar',
                  onclick: (e) => {
                    const showing = secretInput.type === 'text';
                    secretInput.type = showing ? 'password' : 'text';
                    mount(e.currentTarget, icon(showing ? 'eye' : 'eyeOff', 16));
                  },
                },
                icon('eye', 16)
              ),
            ]),
            { required: true }
          ),
        ]),
        h('div.field__hint', [
          icon('lock', 12, 'inline-icon'),
          ' Stored encrypted by the operating system; only your account can read them.',
        ]),
        savedKeys().length
          ? h(
              'button.linkish',
              {
                type: 'button',
                onclick: () => {
                  data.newCredentials = false;
                  paint();
                },
              },
              'Usar las claves ya guardadas'
            )
          : null,
      ]);
    }

    function savedCredentials(saved) {
      return h('div.saved-creds', [
        h('div.saved-creds__mark', icon('key', 16)),
        h('div.saved-creds__text', [
          h(
            'div.saved-creds__title',
            'Using your saved credentials'
          ),
          h('div.saved-creds__sub', saved ? saved.accessKeyId : ''),
        ]),
        h(
          'button.linkish',
          {
            type: 'button',
            onclick: () => {
              data.newCredentials = true;
              paint();
            },
          },
          'Usar otras'
        ),
      ]);
    }

    function moreOptions(target) {
      return h('details.more', [
        h('summary.more__summary', [icon('chevronRight', 14), h('span', 'Más opciones')]),
        h('div.more__body', [
          h('div.form-row', [
            field(
              'Nombre a mostrar',
              h('input.input', {
                type: 'text',
                value: target.name,
                placeholder: target.bucket || 'El del bucket',
                oninput: (e) => {
                  target.name = e.target.value;
                },
              })
            ),
            field(
              'Carpeta dentro del bucket',
              h('input.input.input--mono', {
                type: 'text',
                value: target.prefix,
                placeholder: 'todo el bucket',
                oninput: (e) => {
                  target.prefix = e.target.value.replace(/^\/+/, '').trim();
                },
              })
            ),
          ]),
          switchRow('Montar al abrir OmniMount', target.autoMount, (v) => {
            target.autoMount = v;
          }),
          switchRow('Solo lectura', target.readOnly, (v) => {
            target.readOnly = v;
          }, { hint: 'Impide escribir en el bucket desde este equipo.' }),
        ]),
      ]);
    }

    function showError(message) {
      mount(errorSlot, [
        h('div.alert.alert--error', [
          icon('alert', 18, 'alert__icon'),
          h('div.alert__body.selectable', message),
        ]),
      ]);
      body.parentNode.scrollTop = 0;
    }

    paint();

    const handle = modal.open({
      title: editing ? 'Editar unidad' : 'Nueva unidad',
      description: editing
        ? 'Los cambios se aplican al volver a montar.'
        : 'Indica el bucket y tus claves de acceso. Del resto nos ocupamos nosotros.',
      wide: true,
      body,
      footer: h('div.row', [
        h('button.btn.btn--ghost', { type: 'button', onclick: () => handle.close() }, 'Cancelar'),
        h(
          'button.btn.btn--primary',
          { type: 'button', onclick: (e) => submit(e.currentTarget) },
          [
            icon(editing ? 'check' : 'plus', 16, 'btn__icon'),
            h('span', editing ? 'Guardar' : 'Crear unidad'),
          ]
        ),
      ]),
    });

    async function submit(button) {
      mount(errorSlot, []);

      if (!data.endpoint) return showError('Enter the endpoint of the service.');
      if (!data.bucket) return showError('Enter the bucket name.');
      if (data.newCredentials && (!data.accessKeyId || !data.secretAccessKey)) {
        return showError('Both the access key and the secret key are required.');
      }
      if (!data.driveLetter) {
        return showError('No hay ninguna letra de unidad libre en este equipo.');
      }

      await withBusy(button, async () => {
        const payload = {
          id: data.id,
          endpoint: data.endpoint,
          bucket: data.bucket,
          driveLetter: data.driveLetter,
          name: data.name,
          prefix: data.prefix,
          readOnly: data.readOnly,
          autoMount: data.autoMount,
          connectionId: data.newCredentials ? null : data.connectionId,
          accessKeyId: data.newCredentials ? data.accessKeyId : '',
          secretAccessKey: data.newCredentials ? data.secretAccessKey : '',
        };

        // El alta valida el acceso real contra el bucket, así que su mensaje
        // de error es el que hay que enseñar dentro del formulario.
        let saved;
        try {
          saved = await app().call(app().api.setup.createDrive(payload), {
            silent: true,
            throwOnError: true,
          });
        } catch (err) {
          showError(err.message);
          return;
        }

        handle.close();
        await Promise.all([app().loadMounts(), app().loadConnections()]);
        app().refreshChrome();
        app().navigate('dashboard', { focus: saved.id });

        if (editing) {
          toast.ok('Cambios guardados.');
          return;
        }

        toast.ok(`Unidad "${saved.name}" creada.`);
        const mounted = await app().call(app().api.mounts.mount(saved.id));
        if (mounted) toast.ok(`Ya puedes usar ${saved.driveLetter}: en el Explorador.`, 'Lista');
      });
    }
  }

  global.OM = global.OM || {};
  global.OM.driveForm = { open };
})(window);

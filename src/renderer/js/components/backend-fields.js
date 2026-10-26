'use strict';

/**
 * Form fields built from the backend catalogue.
 *
 * Nothing here knows what S3 or SFTP are. The main process reads every
 * backend's options from rclone and hands them over with a type, a label,
 * help text, whether they are required and whether they hold a password;
 * this turns that description into inputs.
 *
 * The consequence is that a backend rclone gains tomorrow gets a working
 * form with no change to this file.
 */

window.OM = window.OM || {};

OM.backendFields = (() => {
  const { h, field } = OM.dom;

  /**
   * Fields worth showing before the user asks for more.
   *
   * rclone marks the rest as advanced, and those are genuinely advanced: S3
   * alone has 64 of them. Showing all 78 would bury the four that matter.
   */
  function basic(backend) {
    return backend.fields.filter((f) => !f.advanced);
  }

  function advanced(backend) {
    return backend.fields.filter((f) => f.advanced);
  }

  /**
   * One input, chosen by what rclone says the option is.
   *
   * `exclusive` means the listed examples are the only valid values, so it
   * becomes a closed dropdown. Otherwise they are suggestions and the field
   * stays free text with a datalist, because rclone accepts values outside
   * its own examples for most options.
   */
  function input(spec, value, onChange) {
    const id = `f_${spec.name}`;

    if (spec.type === 'bool') {
      return h('label.switch', [
        h('input', {
          type: 'checkbox',
          checked: value === true || value === 'true',
          onchange: (e) => onChange(spec.name, e.target.checked ? 'true' : 'false'),
        }),
        h('span.switch__track', h('span.switch__thumb')),
        h('span.switch__label', spec.label),
      ]);
    }

    if (spec.exclusive && spec.options.length) {
      return h(
        'select.select',
        { onchange: (e) => onChange(spec.name, e.target.value) },
        [
          h('option', { value: '' }, '—'),
          ...spec.options.map((o) =>
            h('option', { value: o.value, selected: o.value === value }, o.label)
          ),
        ]
      );
    }

    const node = h('input.input', {
      // A password field is masked; a plain one is not. `secret` means rclone
      // stores it obscured, `sensitive` that it should merely not be shown.
      type: spec.secret || spec.sensitive ? 'password' : spec.type === 'int' ? 'number' : 'text',
      value: value === undefined || value === null ? '' : value,
      placeholder: spec.default || '',
      spellcheck: 'false',
      list: spec.options.length ? `${id}_list` : null,
      oninput: (e) => onChange(spec.name, e.target.value),
    });

    if (!spec.options.length) return node;

    return h('div.field__combo', [
      node,
      h(
        `datalist#${id}_list`,
        spec.options.map((o) => h('option', { value: o.value }, o.label))
      ),
    ]);
  }

  /** Every visible field of a backend, as form rows. */
  function render(backend, values, onChange, options = {}) {
    const specs = options.advanced ? advanced(backend) : basic(backend);

    return specs.map((spec) =>
      field(spec.label, input(spec, values[spec.name], onChange), {
        required: spec.required,
        hint: spec.help,
      })
    );
  }

  /** Which fields must be filled before the form can be submitted. */
  function missing(backend, values) {
    return basic(backend)
      .filter((f) => f.required)
      .filter((f) => {
        const v = values[f.name];
        return v === undefined || v === null || String(v).trim() === '';
      })
      .map((f) => f.label);
  }

  /** Defaults for a backend, so the form starts in a working state. */
  function initial(backend) {
    const values = {};
    for (const spec of backend.fields) {
      if (spec.default !== null && spec.default !== undefined && spec.default !== '') {
        values[spec.name] = spec.default;
      }
    }
    return values;
  }

  return { render, missing, initial, basic, advanced };
})();

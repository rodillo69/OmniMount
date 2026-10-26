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
   * Does an option apply to the provider in use?
   *
   * rclone encodes the rule in each option: empty means every provider, a
   * comma list restricts it, and a leading "!" turns the list into an
   * exclusion. Honouring it is what stops a Wasabi form asking for an IBM
   * API key, or an AireCloud form offering AWS storage classes.
   */
  function appliesTo(spec, provider) {
    const rule = (spec.providers || '').trim();
    if (!rule) return true;
    if (!provider) return true;

    if (rule.startsWith('!')) {
      const excluded = rule.slice(1).split(',').map((x) => x.trim());
      return !excluded.includes(provider);
    }

    return rule.split(',').map((x) => x.trim()).includes(provider);
  }

  /**
   * A field's label.
   *
   * rclone names its options in English, and translating all of them across
   * 45 backends is not realistic. The handful that appear in almost every
   * form are translated; the rest keep rclone's name, which is also what its
   * own documentation uses.
   */
  function labelFor(spec) {
    const key = `field.${spec.name}`;
    const translated = t(key);
    return translated === key ? spec.label : translated;
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
      // The project's own switch: building one here produced a bare checkbox
      // next to a track that did nothing.
      return OM.dom.switchRow(
        labelFor(spec),
        value === true || value === 'true',
        (checked) => onChange(spec.name, checked ? 'true' : 'false'),
        { hint: spec.help }
      );
    }

    // A long suggestion list has to be a real <select>. As a datalist the
    // browser drops an unbounded panel that runs off the bottom of the
    // window — S3 alone offers 53 providers. A select is clamped to the
    // viewport and scrolls inside itself.
    const asSelect = spec.exclusive || spec.options.length > 6;

    if (asSelect && spec.options.length) {
      const known = spec.options.some((o) => o.value === value);
      // A non-exclusive field still accepts anything, so keep an escape hatch
      // rather than trapping the user inside rclone's examples.
      const freeAllowed = !spec.exclusive;
      const isCustom = freeAllowed && value && !known;

      const select = h(
        'select.select',
        {
          onchange: (e) => {
            if (e.target.value === '__custom__') {
              onChange(spec.name, '');
              onChange.repaint && onChange.repaint();
              return;
            }
            onChange(spec.name, e.target.value);
          },
        },
        [
          h('option', { value: '' }, '—'),
          ...spec.options.map((o) =>
            h('option', { value: o.value, selected: o.value === value }, o.label)
          ),
          freeAllowed
            ? h('option', { value: '__custom__', selected: isCustom }, t('form.otherValue'))
            : null,
        ]
      );

      if (!isCustom) return select;

      return h('div.field__stack', [
        select,
        h('input.input', {
          type: 'text',
          value,
          placeholder: spec.default || '',
          spellcheck: 'false',
          oninput: (e) => onChange(spec.name, e.target.value),
        }),
      ]);
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
    const skip = new Set(options.skip || []);
    const provider = values.provider || '';
    const specs = (options.advanced ? advanced(backend) : basic(backend)).filter(
      (spec) => !skip.has(spec.name) && appliesTo(spec, provider)
    );

    return specs.map((spec) => {
      const control = input(spec, values[spec.name], onChange);
      // A switch already carries its own label and hint; wrapping it in a
      // field would print both of them twice.
      if (spec.type === 'bool') return control;

      // Where the label is translated it already says what the field is, and
      // rclone's own help is only available in English. Showing it there
      // would put an English sentence under a Spanish label.
      const key = `field.${spec.name}`;
      const translated = t(key) !== key;

      return field(labelFor(spec), control, {
        required: spec.required,
        hint: translated ? null : spec.help,
      });
    });
  }

  /** Which fields must be filled before the form can be submitted. */
  function missing(backend, values, skip = []) {
    const hidden = new Set(skip);
    const provider = values.provider || '';
    return basic(backend)
      .filter((f) => f.required && !hidden.has(f.name) && appliesTo(f, provider))
      .filter((f) => {
        const v = values[f.name];
        return v === undefined || v === null || String(v).trim() === '';
      })
      .map((f) => labelFor(f));
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

  return { render, missing, initial, basic, advanced, appliesTo };
})();

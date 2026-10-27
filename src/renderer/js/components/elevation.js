/* OmniMount — pantalla de bloqueo cuando la aplicación corre elevada.
   Aparece antes que cualquier otra cosa: configurar unidades no sirve de nada
   mientras Windows no vaya a mostrarlas. */
(function (global) {
  'use strict';

  const { h, mount } = global.OM.dom;
  const { icon } = global.OM.icons;

  let overlay = null;

  function build(onRestart) {
    const actions = h('div.setup__actions');
    const note = h('div.setup__message');

    const restart = h(
      'button.btn.btn--light.btn--lg',
      { type: 'button' },
      [icon('refresh', 17, 'btn__icon'), h('span', t('elevation.restart'))]
    );

    restart.addEventListener('click', async () => {
      restart.disabled = true;
      mount(restart, [h('span', t('elevation.restarting'))]);
      const ok = await onRestart();
      if (!ok) {
        restart.disabled = false;
        mount(restart, [icon('refresh', 17, 'btn__icon'), h('span', t('elevation.restart'))]);
        mount(note, [
          h('div.setup__error', [icon('alert', 16), h('span.selectable', t('elevation.failed'))]),
        ]);
      }
    });

    mount(actions, [
      restart,
      h(
        'button.btn.btn--ghost.btn--lg',
        { type: 'button', onclick: () => global.omni.window.close() },
        t('elevation.quit')
      ),
    ]);

    overlay = h('div.setup', [
      h('div.setup__panel', [
        h('div.setup__logo', global.OM.brand.lockup({ size: 26 })),
        h('div.setup__kicker', t('elevation.kicker')),
        h('h1.setup__title', t('elevation.title')),
        h('p.setup__text', t('elevation.body')),
        h('div.setup__elevation', [icon('shield', 15), h('span', t('elevation.why'))]),
        actions,
        note,
      ]),
    ]);

    document.body.appendChild(overlay);
  }

  /** Blocks the interface. There is no way past it other than restarting. */
  function show(onRestart) {
    if (!overlay) build(onRestart);
    overlay.style.display = '';
  }

  global.OM = global.OM || {};
  global.OM.elevation = { show };
})(window);

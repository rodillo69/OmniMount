/* OmniMount - the notice that a new version exists. */
(function (global) {
  'use strict';

  const { h, switchRow } = global.OM.dom;
  const modal = global.OM.modal;
  const { icon } = global.OM.icons;
  const fmt = global.OM.fmt;

  // Only one notice at a time. A second hourly check while the dialog is
  // open would otherwise stack another one on top of it.
  let handle = null;
  let version = '';
  let skipThis = false;

  function app() {
    return global.OM.app;
  }

  function t(key, vars) {
    return global.OM.i18n.t(key, vars);
  }

  /**
   * Release notes arrive from GitHub as HTML.
   *
   * They are rendered as text, never inserted as markup. The source is this
   * project's own releases, but a dialog in a privileged renderer is not the
   * place to make an exception to that rule.
   */
  function notesLines(notes) {
    if (!notes) return [];
    const raw = Array.isArray(notes)
      ? notes.map((n) => (n && n.note) || '').join('\n')
      : String(notes);
    return (
      raw
        // The block tags are where one point ends and the next begins. Strip
        // them first and the whole changelog arrives as one long sentence.
        .replace(/<\/(p|li|h\d|div)>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        // Enough to see what changed without the dialog becoming a document.
        .slice(0, 6)
        .map((line) => (line.length > 160 ? `${line.slice(0, 160)}…` : line))
    );
  }

  function open(found) {
    if (handle) return;
    // Not over the first-run screen: the dialog would be drawn underneath it
    // and could not be answered. Nothing is recorded, so the next check an
    // hour from now asks again, by which time setup is long finished.
    if (global.OM.setup && global.OM.setup.isShowing()) return;
    version = (found && found.version) || '';
    skipThis = false;

    const lines = notesLines(found && found.notes);

    handle = modal.open({
      title: t('update.availableTitle'),
      description: t('update.availableDesc', { version }),
      body: h('div.stack', [
        lines.length
          ? h(
              'ul.update__notes',
              { style: { fontSize: 'var(--fs-sm)' } },
              lines.map((line) => h('li.muted', line))
            )
          : null,
        h('div.update__progress', { style: { display: 'none' } }),
        h('div.update__skip', switchRow(t('update.dontShowAgain'), false, (value) => {
          skipThis = value;
        }, { hint: t('update.dontShowAgainHint', { version }) })),
      ]),
      footer: footerIdle(),
      onClose: () => {
        // Closing with the escape key or the backdrop is "later": the user
        // has not said never, only not now.
        if (handle) dismiss('later');
      },
    });
  }

  function footerIdle() {
    return h('div.row', [
      h(
        'button.btn.btn--ghost',
        { type: 'button', onclick: () => dismiss('later') },
        t('update.later')
      ),
      h(
        'button.btn.btn--primary',
        { type: 'button', 'data-autofocus': '', onclick: startDownload },
        [icon('download', 16, 'btn__icon'), h('span', t('update.updateNow'))]
      ),
    ]);
  }

  function footerReady() {
    return h('div.row', [
      h(
        'button.btn.btn--ghost',
        { type: 'button', onclick: () => dismiss('later') },
        t('update.later')
      ),
      h(
        'button.btn.btn--primary',
        { type: 'button', 'data-autofocus': '', onclick: install },
        [icon('power', 16, 'btn__icon'), h('span', t('update.restartAndInstall'))]
      ),
    ]);
  }

  /**
   * Record the dismissal, then close.
   *
   * The switch is read here rather than when it is flipped, so flipping it
   * and then choosing "update now" does not leave a skip behind for a
   * version that is about to be installed anyway.
   */
  async function dismiss(mode) {
    const current = handle;
    handle = null;
    if (current) current.close();

    if (skipThis && version) {
      await app().call(app().api.update.skip(version), { silent: true });
    } else if (mode === 'later') {
      await app().call(app().api.update.later(), { silent: true });
    }
  }

  async function startDownload() {
    if (!handle) return;
    // Nothing left to decline once the download is running, and the switch
    // would still be read on close.
    skipThis = false;
    const skipNode = handle.dialog.querySelector('.update__skip');
    if (skipNode) skipNode.remove();
    showProgress({ percent: 0 });
    handle.setFooter(
      h('div.row', [h('span.muted', { style: { fontSize: 'var(--fs-sm)' } }, t('update.downloading'))])
    );
    await app().call(app().api.update.download(), { silent: true });
  }

  async function install() {
    if (handle) {
      handle.setFooter(
        h('div.row', [h('span.muted', { style: { fontSize: 'var(--fs-sm)' } }, t('update.installing'))])
      );
    }
    // Unmounts every drive and hands over to the installer, so there is
    // nothing to do afterwards.
    await app().call(app().api.update.install(), { silent: true });
  }

  function showProgress(progress) {
    if (!handle) return;
    const node = handle.dialog.querySelector('.update__progress');
    if (!node) return;
    node.style.display = '';
    const percent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)));
    node.textContent = progress.total
      ? t('update.progress', {
          percent,
          done: fmt.bytes(progress.transferred || 0),
          total: fmt.bytes(progress.total),
          speed: fmt.speed(progress.bps || 0),
        })
      : t('update.progressPlain', { percent });
  }

  /** Called from the application's update:state subscription. */
  function onState(state) {
    if (!handle || !state) return;
    if (state.status === 'downloading' && state.progress) showProgress(state.progress);
    if (state.status === 'ready') {
      showProgress({ percent: 100 });
      handle.setFooter(footerReady());
    }
    if (state.status === 'error') {
      handle.setFooter(
        h('div.row', [
          h(
            'span.danger',
            { style: { fontSize: 'var(--fs-sm)', marginRight: 'auto' } },
            t('update.failed')
          ),
          h('button.btn.btn--ghost', { type: 'button', onclick: () => dismiss('later') }, t('update.close')),
        ])
      );
    }
  }

  global.OM.updateNotice = { open, onState, isOpen: () => Boolean(handle) };
})(window);

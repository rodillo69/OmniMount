/* OmniMount - brand mark.
   Drawn inline so it stays sharp at any size, follows the theme through
   currentColor, and keeps the package free of image files. */
(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * The mark: three stacked plates, the topmost one in the accent colour.
   * It reads as storage at a glance and stays legible down to 16px, which a
   * more literal drawing of a drive would not.
   */
  function mark(size, accent) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', String(size || 24));
    svg.setAttribute('height', String(size || 24));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const plates = [
      { y: 19, opacity: 0.35, color: 'currentColor' },
      { y: 13.5, opacity: 0.6, color: 'currentColor' },
      { y: 8, opacity: 1, color: accent || 'currentColor' },
    ];

    for (const plate of plates) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', '4');
      rect.setAttribute('y', String(plate.y));
      rect.setAttribute('width', '24');
      rect.setAttribute('height', '5');
      rect.setAttribute('rx', '2.5');
      rect.setAttribute('fill', plate.color);
      rect.setAttribute('opacity', String(plate.opacity));
      svg.appendChild(rect);
    }

    return svg;
  }

  /** Mark plus wordmark, for the title bar and the sidebar. */
  function lockup(options) {
    const opts = options || {};
    const wrap = document.createElement('span');
    wrap.className = 'lockup' + (opts.className ? ` ${opts.className}` : '');

    wrap.appendChild(mark(opts.size || 20, opts.accent));

    const name = document.createElement('span');
    name.className = 'lockup__name';
    // Two weights in one word: the join is the whole idea of the product.
    const omni = document.createElement('strong');
    omni.textContent = 'Omni';
    const mount = document.createElement('span');
    mount.textContent = 'Mount';
    name.appendChild(omni);
    name.appendChild(mount);
    wrap.appendChild(name);

    return wrap;
  }

  global.OM = global.OM || {};
  global.OM.brand = { mark, lockup };
})(window);

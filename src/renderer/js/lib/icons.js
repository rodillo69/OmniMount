/* OmniMount - iconografía.
   Trazos rectos sobre cuadrícula de 24, en consonancia con el logo. */
(function (global) {
  'use strict';

  const PATHS = {
    dashboard: ['M3 3h8v7H3z', 'M13 3h8v4h-8z', 'M13 9h8v12h-8z', 'M3 12h8v9H3z'],
    drive: [
      'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3z',
      'M3 13a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M7 7.5h2',
      'M7 16.5h2',
      'M16.5 16.5h1',
    ],
    plug: [
      'M9 3v5',
      'M15 3v5',
      'M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6z',
      'M12 17v4',
    ],
    folder: ['M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
    file: ['M6 3h8l5 5v13H6z', 'M14 3v5h5'],
    settings: [
      'M4 7h10',
      'M18 7h2',
      'M4 12h2',
      'M10 12h10',
      'M4 17h12',
      'M20 17h0',
      { tag: 'circle', cx: 16, cy: 7, r: 2 },
      { tag: 'circle', cx: 8, cy: 12, r: 2 },
      { tag: 'circle', cx: 18, cy: 17, r: 2 },
    ],
    shield: ['M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z', 'M8.5 12l2.5 2.5L16 9.5'],
    terminal: ['M3 4h18v16H3z', 'M7 9l2.5 2.5L7 14', 'M12.5 14.5h4.5'],
    plus: ['M12 5v14', 'M5 12h14'],
    play: ['M7 4.5l12 7.5-12 7.5z'],
    stop: ['M6 6h12v12H6z'],
    refresh: ['M20 11a8 8 0 0 0-13.7-5.3L3 9', 'M3 4v5h5', 'M4 13a8 8 0 0 0 13.7 5.3L21 15', 'M21 20v-5h-5'],
    rotate: ['M20 12a8 8 0 1 1-2.3-5.7', 'M21 3v5h-5'],
    external: ['M14 4h6v6', 'M20 4l-8.5 8.5', 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4'],
    trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
    edit: ['M4 20h4L20 8l-4-4L4 16z', 'M14.5 5.5l4 4'],
    chevronRight: ['M9 5l7 7-7 7'],
    chevronLeft: ['M15 5l-7 7 7 7'],
    chevronDown: ['M5 9l7 7 7-7'],
    chevronUp: ['M5 15l7-7 7 7'],
    arrowRight: ['M4 12h15', 'M13 6l6 6-6 6'],
    arrowLeft: ['M20 12H5', 'M11 6l-6 6 6 6'],
    eye: ['M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z', { tag: 'circle', cx: 12, cy: 12, r: 3 }],
    eyeOff: ['M4 4l16 16', 'M9.5 5.8A10.6 10.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a18 18 0 0 1-2.8 3.6', 'M6.5 7.9A17.6 17.6 0 0 0 2 12s3.6 6.5 10 6.5c1.2 0 2.3-.2 3.3-.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    check: ['M4 12.5l5 5L20 6.5'],
    checkCircle: [{ tag: 'circle', cx: 12, cy: 12, r: 9 }, 'M8 12.2l2.8 2.8L16 9.8'],
    x: ['M6 6l12 12', 'M18 6L6 18'],
    alert: ['M12 3l9 17H3z', 'M12 9v5', 'M12 17h.01'],
    info: [{ tag: 'circle', cx: 12, cy: 12, r: 9 }, 'M12 11v6', 'M12 8h.01'],
    download: ['M12 3v12', 'M7.5 10.5L12 15l4.5-4.5', 'M4 20h16'],
    upload: ['M12 16V4', 'M7.5 8.5L12 4l4.5 4.5', 'M4 20h16'],
    cloud: ['M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9.5 3.75 3.75 0 0 1 17 18z'],
    bucket: [
      { tag: 'ellipse', cx: 12, cy: 6, rx: 8, ry: 3 },
      'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
      'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    ],
    lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3', 'M12 15v2'],
    key: [{ tag: 'circle', cx: 8, cy: 12, r: 4 }, 'M12 12h9', 'M17 12v3.5', 'M20 12v2.5'],
    copy: ['M9 9h11v11H9z', 'M15 5H4v11h3'],
    search: [{ tag: 'circle', cx: 11, cy: 11, r: 6 }, 'M20 20l-4.7-4.7'],
    clock: [{ tag: 'circle', cx: 12, cy: 12, r: 9 }, 'M12 7.5V12l3.5 2'],
    activity: ['M3 12h4l3-7 4 14 3-7h4'],
    link: ['M9.5 14.5l5-5', 'M8 10.5L6 12.5a3.5 3.5 0 0 0 5 5l2-2', 'M16 13.5l2-2a3.5 3.5 0 0 0-5-5l-2 2'],
    folderPlus: ['M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M12 11v6', 'M9 14h6'],
    home: ['M4 11l8-7 8 7', 'M6 10v10h12V10'],
    sliders: ['M4 6h16', 'M4 12h16', 'M4 18h16', { tag: 'circle', cx: 9, cy: 6, r: 2 }, { tag: 'circle', cx: 15, cy: 12, r: 2 }, { tag: 'circle', cx: 7, cy: 18, r: 2 }],
    package: ['M12 3l9 4.5v9L12 21l-9-4.5v-9z', 'M3 7.5l9 4.5 9-4.5', 'M12 12v9'],
    power: ['M12 4v8', 'M7.8 6.8a7 7 0 1 0 8.4 0'],
    windowIcon: ['M4 5h16v14H4z', 'M4 9h16'],
    network: [
      { tag: 'rect', x: 8, y: 3, width: 8, height: 5, rx: 1 },
      { tag: 'rect', x: 2, y: 16, width: 7, height: 5, rx: 1 },
      { tag: 'rect', x: 15, y: 16, width: 7, height: 5, rx: 1 },
      'M12 8v4',
      'M5.5 16v-2h13v2',
    ],
    database: [
      { tag: 'ellipse', cx: 12, cy: 5.5, rx: 7.5, ry: 2.8 },
      'M4.5 5.5v13c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-13',
      'M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8',
    ],
  };

  function icon(name, size, extraClass) {
    const paths = PATHS[name];
    if (!paths) {
      // Fail loudly in development, harmlessly in use.
      console.warn(`[icons] no existe el icono "${name}"`);
      return global.OM.dom.svg(['M4 4h16v16H4z'], size, extraClass);
    }
    return global.OM.dom.svg(paths, size, extraClass);
  }

  global.OM = global.OM || {};
  global.OM.icons = { icon, names: Object.keys(PATHS) };
})(window);

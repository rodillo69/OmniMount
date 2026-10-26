'use strict';

/**
 * Interface text in Spanish and English.
 *
 * Every string the user can read lives here under a key. Nothing is written
 * directly in a view, because a string written inline is a string that cannot
 * be translated and, worse, one that silently stays in whichever language it
 * was typed in — which is how an interface ends up half in each.
 *
 * The language follows the operating system unless the user picks one, and
 * the choice is stored with the rest of the settings.
 */

(function (global) {
  const CATALOGUE = {
    es: {
      /* ------------------------------------------------------ general */
      'app.drives': 'Unidades',
      'app.explorer': 'Explorador',
      'app.logs': 'Registro',
      'app.settings': 'Ajustes',
      'app.remoteStorage': 'Almacenamiento remoto',
      'action.cancel': 'Cancelar',
      'action.save': 'Guardar',
      'action.create': 'Crear unidad',
      'action.creating': 'Creando…',
      'action.saving': 'Guardando…',
      'action.change': 'Cambiar',
      'action.retry': 'Reintentar',
      'action.close': 'Cerrar',
      'action.delete': 'Eliminar',

      /* -------------------------------------------------------- ventana */
      'window.minimize': 'Minimizar',
      'window.maximize': 'Maximizar',
      'window.restore': 'Restaurar',
      'window.close': 'Cerrar',

      /* ------------------------------------------------------ unidades */
      'drives.title': 'Unidades',
      'drives.subtitle': 'Cada unidad es un almacenamiento remoto publicado como disco en este equipo.',
      'drives.new': 'Nueva unidad',
      'drives.emptyTitle': 'Conecta tu primera unidad',
      'drives.emptyText':
        'Elige dónde está tu almacenamiento y cómo entrar. En unos segundos lo tendrás como una unidad de Windows.',
      'drives.none': 'Todavía no hay ninguna unidad configurada.',
      'drives.active': 'Unidades activas',
      'drives.transfer': 'Transferencia',
      'drives.mount': 'Montar',
      'drives.unmount': 'Desmontar',
      'drives.mounted': 'Montada',
      'drives.unmounted': 'Sin montar',
      'drives.mounting': 'Montando…',
      'drives.unmounting': 'Desmontando…',
      'drives.error': 'Error',
      'drives.noneMounted': 'Sin unidades montadas',
      'drives.removeTitle': '¿Eliminar la unidad?',
      'drives.removeDetail':
        'El contenido remoto no se toca: sólo se elimina el montaje en este equipo.',

      /* ----------------------------------------------------- formulario */
      'form.newTitle': 'Nueva unidad',
      'form.newDesc': 'Elige a qué te conectas y rellena sus datos.',
      'form.editTitle': 'Editar unidad',
      'form.editDesc': 'Sólo lo que se puede cambiar sin rehacer la unidad.',
      'form.search': 'Buscar entre {count} tipos de almacenamiento…',
      'form.noMatch': 'Nada coincide con «{query}».',
      'form.signInRequired': 'requiere iniciar sesión',
      'form.signInUnsupported':
        '{label} necesita iniciar sesión en el navegador, que todavía no está disponible.',
      'form.driveLetter': 'Letra de unidad',
      'form.driveLetterHint': 'Con la que aparecerá en el Explorador de Windows.',
      'form.moreOptions': 'Más opciones ({count})',
      'form.savedConnection': 'Usando la conexión guardada',
      'form.required': 'Hacen falta: {fields}.',
      'form.rootRequired': '{label} es obligatorio.',
      'form.rootHintContainer': 'Tal y como se llama en el servidor.',
      'form.rootHintPath': 'Déjalo vacío para empezar en la raíz.',
      'form.created': 'Unidad creada.',
      'form.updated': 'Unidad actualizada.',
      'form.failed': 'No se pudo crear la unidad.',
      'form.noTypes': 'No se pudo leer la lista de tipos de almacenamiento desde rclone.',

      /* ----------------------------------------------------- explorador */
      'explorer.title': 'Explorador',
      'explorer.subtitle':
        'Navega por el almacenamiento sin montar la unidad. Las operaciones van directas al servidor remoto.',
      'explorer.emptyText': 'Crea una unidad y podrás navegar por su contenido desde aquí.',
      'explorer.readFailed': 'No se pudo leer el contenido remoto.',
      'explorer.upload': 'Subir archivos',
      'explorer.download': 'Descargar',
      'explorer.newFolder': 'Nueva carpeta',
      'explorer.rename': 'Renombrar',
      'explorer.folderNameRequired': 'Hace falta un nombre de carpeta.',
      'explorer.noSlashes': 'El nombre no puede contener barras.',

      /* --------------------------------------------------------- ajustes */
      'settings.title': 'Ajustes',
      'settings.language': 'Idioma',
      'settings.languageHint': 'El de Windows si no eliges otro.',
      'settings.languageSystem': 'El del sistema',
      'settings.connections': 'Conexiones',

      /* --------------------------------- nombres propios de los backends */
      'backend.s3': 'Almacenamiento compatible con S3',
      'backend.sftp': 'SFTP (SSH)',
      'backend.ftp': 'FTP',
      'backend.webdav': 'WebDAV',
      'backend.smb': 'Carpeta compartida de Windows (SMB)',
      'backend.b2': 'Backblaze B2',
      'backend.azureblob': 'Azure Blob Storage',
      'backend.swift': 'OpenStack Swift',
      'backend.http': 'HTTP (solo lectura)',
    },

    en: {
      'app.drives': 'Drives',
      'app.explorer': 'Browser',
      'app.logs': 'Log',
      'app.settings': 'Settings',
      'app.remoteStorage': 'Remote storage',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.create': 'Create drive',
      'action.creating': 'Creating…',
      'action.saving': 'Saving…',
      'action.change': 'Change',
      'action.retry': 'Try again',
      'action.close': 'Close',
      'action.delete': 'Delete',

      'window.minimize': 'Minimise',
      'window.maximize': 'Maximise',
      'window.restore': 'Restore',
      'window.close': 'Close',

      'drives.title': 'Drives',
      'drives.subtitle': 'Each drive is remote storage published as a disk on this computer.',
      'drives.new': 'New drive',
      'drives.emptyTitle': 'Connect your first drive',
      'drives.emptyText':
        'Choose where your storage is and how to sign in. In a few seconds it will be a Windows drive.',
      'drives.none': 'No drives configured yet.',
      'drives.active': 'Active drives',
      'drives.transfer': 'Transfer',
      'drives.mount': 'Mount',
      'drives.unmount': 'Unmount',
      'drives.mounted': 'Mounted',
      'drives.unmounted': 'Not mounted',
      'drives.mounting': 'Mounting…',
      'drives.unmounting': 'Unmounting…',
      'drives.error': 'Error',
      'drives.noneMounted': 'No drives mounted',
      'drives.removeTitle': 'Remove this drive?',
      'drives.removeDetail':
        'Nothing on the server is touched: only the mount on this computer is removed.',

      'form.newTitle': 'New drive',
      'form.newDesc': 'Choose what you are connecting to, then fill in its details.',
      'form.editTitle': 'Edit drive',
      'form.editDesc': 'Only what can change without rebuilding the drive.',
      'form.search': 'Search {count} storage types…',
      'form.noMatch': 'Nothing matches “{query}”.',
      'form.signInRequired': 'sign-in required',
      'form.signInUnsupported': '{label} needs browser sign-in, which is not supported yet.',
      'form.driveLetter': 'Drive letter',
      'form.driveLetterHint': 'How it appears in Windows Explorer.',
      'form.moreOptions': 'More options ({count})',
      'form.savedConnection': 'Using the saved connection',
      'form.required': 'These are required: {fields}.',
      'form.rootRequired': '{label} is required.',
      'form.rootHintContainer': 'Exactly as it is named on the server.',
      'form.rootHintPath': 'Leave empty to start at the top level.',
      'form.created': 'Drive created.',
      'form.updated': 'Drive updated.',
      'form.failed': 'The drive could not be created.',
      'form.noTypes': 'The list of storage types could not be read from rclone.',

      'explorer.title': 'Browser',
      'explorer.subtitle':
        'Browse the storage without mounting it. Operations go straight to the remote server.',
      'explorer.emptyText': 'Create a drive and you can browse its contents here.',
      'explorer.readFailed': 'The remote contents could not be read.',
      'explorer.upload': 'Upload files',
      'explorer.download': 'Download',
      'explorer.newFolder': 'New folder',
      'explorer.rename': 'Rename',
      'explorer.folderNameRequired': 'A folder name is required.',
      'explorer.noSlashes': 'A name cannot contain slashes.',

      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.languageHint': 'Follows Windows unless you choose one.',
      'settings.languageSystem': 'System language',
      'settings.connections': 'Connections',

      'backend.s3': 'S3 compatible storage',
      'backend.sftp': 'SFTP (SSH)',
      'backend.ftp': 'FTP',
      'backend.webdav': 'WebDAV',
      'backend.smb': 'Windows share (SMB)',
      'backend.b2': 'Backblaze B2',
      'backend.azureblob': 'Azure Blob Storage',
      'backend.swift': 'OpenStack Swift',
      'backend.http': 'HTTP (read-only)',
    },
  };

  const SUPPORTED = Object.keys(CATALOGUE);
  let current = 'es';

  /** The system language, when it is one we have. */
  function systemLanguage() {
    const tags = [global.navigator.language, ...(global.navigator.languages || [])];
    for (const tag of tags) {
      if (!tag) continue;
      const base = String(tag).toLowerCase().split('-')[0];
      if (SUPPORTED.includes(base)) return base;
    }
    return 'en';
  }

  function setLanguage(choice) {
    current = choice && SUPPORTED.includes(choice) ? choice : systemLanguage();
    global.document.documentElement.lang = current;
    return current;
  }

  function language() {
    return current;
  }

  /**
   * Look up a string, filling in {placeholders}.
   *
   * A missing key returns the key itself rather than an empty string: an
   * untranslated label is obvious in testing, a blank one is not.
   */
  function t(key, vars) {
    const table = CATALOGUE[current] || CATALOGUE.en;
    let text = table[key];

    if (text === undefined) {
      text = (CATALOGUE.en && CATALOGUE.en[key]) !== undefined ? CATALOGUE.en[key] : key;
    }

    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, (match, name) =>
      vars[name] === undefined ? match : String(vars[name])
    );
  }

  global.OM = global.OM || {};
  global.OM.i18n = { t, setLanguage, language, systemLanguage, SUPPORTED };
  // Shorthand: views read better as t('drives.title') than OM.i18n.t(...).
  global.t = t;
})(window);

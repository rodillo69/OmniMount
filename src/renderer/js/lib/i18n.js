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

      'app.unidadesActivas': 'Unidades activas',
      'app.transferencia': 'Transferencia',
      'app.omnimountNoPudoArrancar': 'OmniMount no pudo arrancar',
      'app.unidades': 'Unidades',
      'app.explorador': 'Explorador',
      'app.registro': 'Registro',
      'app.ajustes': 'Ajustes',

      'drives.almacenamientoRemoto': 'almacenamiento remoto',
      'drives.unidades': 'Unidades',
      'drives.montarTodas': 'Montar todas',
      'drives.nuevaUnidad': 'Nueva unidad',
      'drives.faltanLasClaves': 'Faltan las credenciales',
      'drives.velocidad': 'Velocidad',
      'drives.transferido': 'Transferido',
      'drives.cache': 'Caché',
      'drives.desmontar': 'Desmontar',
      'drives.montar': 'Montar',
      'drives.desmontarLaUnidad': 'Desmontar la unidad',
      'drives.montarLaUnidad': 'Montar la unidad',
      'drives.seBorraLaConfiguracion': 'Se borra la configuración de esta unidad en OmniMount.',
      'drives.eliminar': 'Eliminar',

      'explorer.contenidoRemoto': 'Contenido remoto',
      'explorer.explorador': 'Explorador',
      'explorer.noHayNadaQue': 'No hay nada que explorar',
      'explorer.creaUnaUnidadY': 'Crea una unidad y podrás navegar por su contenido desde aquí.',
      'explorer.nuevaUnidad': 'Nueva unidad',
      'explorer.descargar': 'Descargar',
      'explorer.eliminar': 'Eliminar',
      'explorer.subir': 'Subir',
      'explorer.nombre': 'Nombre',
      'explorer.modificado': 'Modificado',
      'explorer.carpetaVacia': 'Carpeta vacía',
      'explorer.noHayObjetosBajo': 'No hay nada en esta carpeta.',
      'explorer.cargarMas': 'Cargar más',
      'explorer.listadoParcial': 'Listado parcial',
      'explorer.calcularTamanoTotal': 'Calcular tamaño total',
      'explorer.seleccionarTodo': 'Seleccionar todo',
      'explorer.renombrar': 'Renombrar',
      'explorer.estaAccionNoSe': 'Esta acción no se puede deshacer desde OmniMount.',
      'explorer.nuevaCarpeta': 'Nueva carpeta',
      'explorer.enS3UnaCarpeta': 'En algunos almacenamientos una carpeta sólo existe mientras tenga contenido.',
      'explorer.nuevoNombre': 'Nuevo nombre',

      'logs.diagnostico': 'Diagnóstico',
      'logs.registro': 'Registro',
      'logs.nadaRegistradoTodavia': 'Nada registrado todavía',
      'logs.cuandoCreesYMontes': 'Cuando crees y montes una unidad, su actividad aparecerá aquí.',
      'logs.sinLineas': 'Sin líneas',
      'logs.todo': 'Todo',
      'logs.avisosYErrores': 'Avisos y errores',
      'logs.actividad': 'Actividad',

      'modal.cancelar': 'Cancelar',

      'toast.cerrar': 'Cerrar',

      'settings.preferencias': 'Preferencias',
      'settings.ajustes': 'Ajustes',
      'settings.comportamientoDeOmnimountEn': 'Comportamiento de OmniMount en este equipo.',
      'settings.abrir': 'Abrir',
      'settings.version': 'Versión',
      'settings.motorDeTransferencia': 'Motor de transferencia',
      'settings.plataforma': 'Plataforma',
      'settings.cifradoDeCredenciales': 'Cifrado de credenciales',
      'settings.sistema': 'Sistema',
      'settings.claro': 'Claro',
      'settings.oscuro': 'Oscuro',
      'settings.lasUnidadesEstaranDisponibles': 'Las unidades estarán disponibles nada más encender el equipo.',
      'settings.sinAbrirLaVentana': 'Sin abrir la ventana. Sólo aplica al iniciar con Windows.',
      'settings.recomendadoLasUnidadesSiguen': 'Recomendado: las unidades siguen funcionando. Si lo desactivas, cerrar la ventana las desmonta.',
      'settings.cambiarLaSecretKey': 'Cambiar la clave secreta',
      'settings.nuevaSecretKey': 'Nueva clave secreta',
      'settings.secretKey': 'Clave secreta',
      'settings.eliminarEstasClaves': '¿Eliminar estas credenciales?',
      'settings.noAfectaALos': 'No afecta a los datos del almacenamiento remoto.',
      'settings.eliminar': 'Eliminar',

      'setup.preparandoOmnimount': 'Preparando OmniMount',
      'setup.unMomentoEstamosDejandolo': 'Un momento, estamos dejándolo todo listo',
      'setup.listo': 'Listo',
      'setup.reintentar': 'Reintentar',
      'setup.motorDeTransferencia': 'Motor de transferencia',
      'setup.controladorDeUnidad': 'Controlador de unidad',

      /* --------------------------------- nombres propios de los backends */
      'form.otherValue': 'Otro…',
      'form.provider': 'Proveedor',

      /* ------------------- campos habituales (el resto los nombra rclone) */
      'field.endpoint': 'Dirección del servicio',
      'field.access_key_id': 'Clave de acceso',
      'field.secret_access_key': 'Clave secreta',
      'field.region': 'Región de firma',
      'field.host': 'Servidor',
      'field.port': 'Puerto',
      'field.user': 'Usuario',
      'field.pass': 'Contraseña',
      'field.url': 'Dirección',
      'field.key_file': 'Fichero de clave privada',
      'field.share': 'Recurso compartido',
      'field.domain': 'Dominio',
      'field.account': 'Cuenta',
      'field.key': 'Clave',
      'form.providerPick': 'Elige tu proveedor…',
      'form.providerHint': 'Si el tuyo tiene direcciones conocidas, se rellenan solas.',
      'form.region': 'Región',
      'form.regionHint': 'Cada región tiene sus propias credenciales: las de una no valen en otra.',
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

      'app.unidadesActivas': 'Active drives',
      'app.transferencia': 'Transfer',
      'app.omnimountNoPudoArrancar': 'OmniMount could not start',
      'app.unidades': 'Drives',
      'app.explorador': 'Browser',
      'app.registro': 'Log',
      'app.ajustes': 'Settings',

      'drives.almacenamientoRemoto': 'remote storage',
      'drives.unidades': 'Drives',
      'drives.montarTodas': 'Mount all',
      'drives.nuevaUnidad': 'New drive',
      'drives.faltanLasClaves': 'Credentials missing',
      'drives.velocidad': 'Speed',
      'drives.transferido': 'Transferred',
      'drives.cache': 'Cache',
      'drives.desmontar': 'Unmount',
      'drives.montar': 'Mount',
      'drives.desmontarLaUnidad': 'Unmount the drive',
      'drives.montarLaUnidad': 'Mount the drive',
      'drives.seBorraLaConfiguracion': 'This removes the drive’s configuration from OmniMount.',
      'drives.eliminar': 'Remove',

      'explorer.contenidoRemoto': 'Remote contents',
      'explorer.explorador': 'Browser',
      'explorer.noHayNadaQue': 'Nothing to browse yet',
      'explorer.creaUnaUnidadY': 'Create a drive and you can browse its contents here.',
      'explorer.nuevaUnidad': 'New drive',
      'explorer.descargar': 'Download',
      'explorer.eliminar': 'Delete',
      'explorer.subir': 'Upload',
      'explorer.nombre': 'Name',
      'explorer.modificado': 'Modified',
      'explorer.carpetaVacia': 'Empty folder',
      'explorer.noHayObjetosBajo': 'There is nothing in this folder.',
      'explorer.cargarMas': 'Load more',
      'explorer.listadoParcial': 'Partial listing',
      'explorer.calcularTamanoTotal': 'Calculate total size',
      'explorer.seleccionarTodo': 'Select all',
      'explorer.renombrar': 'Rename',
      'explorer.estaAccionNoSe': 'This cannot be undone from OmniMount.',
      'explorer.nuevaCarpeta': 'New folder',
      'explorer.enS3UnaCarpeta': 'On some storage a folder exists only while it holds something.',
      'explorer.nuevoNombre': 'New name',

      'logs.diagnostico': 'Diagnostics',
      'logs.registro': 'Log',
      'logs.nadaRegistradoTodavia': 'Nothing logged yet',
      'logs.cuandoCreesYMontes': 'Once you create and mount a drive, its activity shows up here.',
      'logs.sinLineas': 'No lines',
      'logs.todo': 'Everything',
      'logs.avisosYErrores': 'Warnings and errors',
      'logs.actividad': 'Activity',

      'modal.cancelar': 'Cancel',

      'toast.cerrar': 'Close',

      'settings.preferencias': 'Preferences',
      'settings.ajustes': 'Settings',
      'settings.comportamientoDeOmnimountEn': 'How OmniMount behaves on this computer.',
      'settings.abrir': 'Open',
      'settings.version': 'Version',
      'settings.motorDeTransferencia': 'Transfer engine',
      'settings.plataforma': 'Platform',
      'settings.cifradoDeCredenciales': 'Credential encryption',
      'settings.sistema': 'System',
      'settings.claro': 'Light',
      'settings.oscuro': 'Dark',
      'settings.lasUnidadesEstaranDisponibles': 'Drives are ready as soon as the computer starts.',
      'settings.sinAbrirLaVentana': 'Without opening the window. Only applies when starting with Windows.',
      'settings.recomendadoLasUnidadesSiguen': 'Recommended: drives keep working. With this off, closing the window unmounts them.',
      'settings.cambiarLaSecretKey': 'Change the secret key',
      'settings.nuevaSecretKey': 'New secret key',
      'settings.secretKey': 'Secret key',
      'settings.eliminarEstasClaves': 'Remove these credentials?',
      'settings.noAfectaALos': 'Nothing on the remote storage is affected.',
      'settings.eliminar': 'Remove',

      'setup.preparandoOmnimount': 'Setting up OmniMount',
      'setup.unMomentoEstamosDejandolo': 'One moment, getting everything ready',
      'setup.listo': 'Ready',
      'setup.reintentar': 'Try again',
      'setup.motorDeTransferencia': 'Transfer engine',
      'setup.controladorDeUnidad': 'Drive driver',

      'form.otherValue': 'Other…',
      'form.provider': 'Provider',

      'field.endpoint': 'Service address',
      'field.access_key_id': 'Access key',
      'field.secret_access_key': 'Secret key',
      'field.region': 'Signing region',
      'field.host': 'Server',
      'field.port': 'Port',
      'field.user': 'User',
      'field.pass': 'Password',
      'field.url': 'Address',
      'field.key_file': 'Private key file',
      'field.share': 'Share',
      'field.domain': 'Domain',
      'field.account': 'Account',
      'field.key': 'Key',
      'form.providerPick': 'Choose your provider…',
      'form.providerHint': 'If your provider is listed, its address is filled in for you.',
      'form.region': 'Region',
      'form.regionHint': 'Each region has its own credentials; keys from one do not work in another.',
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

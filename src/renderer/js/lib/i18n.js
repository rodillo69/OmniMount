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
      'app.unknownError': 'Error desconocido.',
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
      'form.reportedSize': 'Capacidad que muestra Windows (TB)',
      'form.reportedSizePlaceholder': 'Sin indicar',
      'form.reportedSizeHint':
        'El almacenamiento de objetos no informa de su cupo, así que Windows muestra una cifra enorme. Si conoces el tuyo, ponlo aquí y el Explorador lo mostrará. Déjalo vacío si no estás seguro: una cifra menor que la real hace que Windows rechace copias que sí cabrían.',
      'form.updated': 'Unidad actualizada.',
      'form.mounted': 'Unidad {letter}: lista y disponible en el Explorador.',
      'form.savedNotMounted': 'La unidad quedó guardada, pero no se pudo montar: {error}',
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

      'settings.appearance': 'Apariencia',
      'settings.theme': 'Tema',
      'settings.themeHint': 'El modo sistema sigue a la configuración de Windows.',
      'settings.startup': 'Arranque',
      'settings.startupHint': 'Qué hace la aplicación al iniciarse y al cerrarla.',
      'settings.startWithWindows': 'Iniciar con Windows',
      'settings.startInBackground': 'Arrancar en segundo plano',
      'settings.mountOnOpen': 'Montar las unidades automáticas al abrir',
      'settings.closeToTray': 'Al cerrar la ventana, seguir en segundo plano',
      'settings.confirmUnmount': 'Pedir confirmación al desmontar',
      'settings.keys': 'Claves de acceso',
      'settings.keysHint': 'Las credenciales del almacenamiento remoto, cifradas con Windows.',
      'settings.noDrivesUsing': 'Sin unidades asociadas',
      'settings.noKeys': 'Todavía no hay claves guardadas. Se piden al crear la primera unidad.',
      'settings.keyUpdated': 'Clave actualizada.',
      'settings.keyInUse': 'Clave en uso',
      'settings.keysRemoved': 'Claves eliminadas.',
      'settings.components': 'Componentes',
      'settings.componentsHint': 'Lo que OmniMount instaló para poder crear unidades.',
      'settings.allInstalled': 'Todo instalado',
      'settings.componentMissing': 'Falta algún componente',
      'settings.engineMissing': 'Motor no instalado',
      'settings.driverMissing': 'Controlador no instalado',
      'settings.checking': 'Comprobando…',
      'settings.check': 'Comprobar',
      'settings.installNow': 'Instalar ahora',
      'settings.allInstalledToast': 'Todos los componentes están instalados.',
      'settings.installedToast': 'Componentes instalados.',
      'settings.maintenance': 'Mantenimiento',
      'settings.maintenanceHint': 'Dónde guarda sus cosas la aplicación.',
      'settings.dataFolder': 'Carpeta de datos',
      'settings.dataFolderHint': 'Configuración y claves cifradas.',
      'settings.appLog': 'Registro de la aplicación',
      'settings.appLogHint': 'Para enviar a soporte si algo falla.',
      'settings.dpapi': 'DPAPI de Windows',
      'settings.cacheFolderHint': 'Los ficheros que se han abierto o escrito. Se limpia sola.',
      /* ---------------------------------------------------------- cache */
      'cache.title': 'Caché local',
      'cache.description':
        'Los ficheros que se abren o se escriben pasan por el disco. Es lo que hace que la unidad se comporte como un disco y no como una carpeta de red.',
      'cache.reading': 'Mirando la caché…',
      'cache.location': 'Dónde se guarda',
      'cache.onVolume': 'En {letter}: ({label}) · {free} libres',
      'cache.change': 'Cambiar',
      'cache.useDefault': 'Volver a la de por defecto',
      'cache.size': 'Cuánto puede ocupar',
      'cache.automatic': 'Automático',
      'cache.fixed': 'Límite fijo',
      'cache.sizeAutoHint':
        'Usa el espacio que sobre y va soltando lo menos usado, dejando siempre {reserve} GB libres en el disco.',
      'cache.sizeFixedHint':
        'Nunca pasará de {limit} GB, y además dejará {reserve} GB libres en el disco.',
      'cache.used': 'Ocupado ahora',
      'cache.usedHint': 'Borrarla no toca nada del almacenamiento remoto: se vuelve a descargar.',
      'cache.clear': 'Vaciar',
      'cache.clearTitle': '¿Vaciar la caché?',
      'cache.clearMessage':
        'Se borra la copia local de los ficheros ya subidos. No se toca el almacenamiento remoto, y lo que esté pendiente de subir se respeta.',
      'cache.cleared': 'Caché vaciada de {count} unidad(es).',
      'cache.alreadyEmpty': 'No había nada que vaciar.',
      'cache.skippedMounted': '«{name}» está montada: su caché se deja como está.',
      'cache.skippedPending':
        '«{name}» tiene {count} fichero(s) sin subir todavía. Su caché no se ha tocado.',
      'cache.moved': 'La caché se guardará en la ubicación nueva.',
      'cache.movedDefault': 'La caché vuelve a la carpeta de la aplicación.',
      'cache.remountNeeded':
        'Las unidades que ya están montadas seguirán usando la carpeta anterior hasta que las vuelvas a montar.',

      'setup.preparandoOmnimount': 'Preparando OmniMount',
      'setup.unMomentoEstamosDejandolo': 'Un momento, estamos dejándolo todo listo',
      'setup.listo': 'Listo',
      'setup.reintentar': 'Reintentar',
      'setup.motorDeTransferencia': 'Motor de transferencia',
      'setup.controladorDeUnidad': 'Controlador de unidad',
      'setup.reinicioPendiente':
        'El controlador quedó instalado, pero Windows lo carga al reiniciar. Reinicia el equipo y vuelve a abrir OmniMount.',
      'setup.necesitaAdministrador':
        'El controlador de unidad lo tiene que instalar una vez quien administre este equipo: Windows pide credenciales de administrador y esta cuenta no las tiene.',
      'setup.permisoRechazado':
        'Hay que aceptar el aviso de Windows para instalar el controlador de unidad. Sin él no se pueden crear unidades.',

      /* --------------------------------------- ejecución como administrador */
      'elevation.kicker': 'Permisos de Windows',
      'elevation.title': 'No abras OmniMount como administrador',
      'elevation.body':
        'Windows oculta al Explorador las unidades que crea un programa elevado. Las unidades se montarían y OmniMount las vería, pero en «Este equipo» no aparecería ninguna. Ciérralo y ábrelo con un doble clic normal.',
      'elevation.why':
        'OmniMount no necesita permisos de administrador. El único componente que los pide es el controlador de unidad, y lo pide él solo la primera vez.',
      'elevation.restart': 'Reiniciar como usuario normal',
      'elevation.restarting': 'Reiniciando…',
      'elevation.quit': 'Salir',
      'elevation.failed':
        'No se pudo reiniciar automáticamente. Cierra OmniMount y vuelve a abrirlo con un doble clic normal, sin «Ejecutar como administrador».',
      'elevation.mountBlocked':
        'OmniMount se está ejecutando como administrador y Windows no mostraría la unidad en el Explorador. Ciérralo y ábrelo con un doble clic normal.',

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
      'app.unknownError': 'Unknown error.',
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
      'form.reportedSize': 'Capacity shown by Windows (TB)',
      'form.reportedSizePlaceholder': 'Not stated',
      'form.reportedSizeHint':
        'Object storage does not report its quota, so Windows shows an enormous figure. If you know yours, put it here and Explorer will show it. Leave it empty if you are not sure: a figure smaller than the real quota makes Windows refuse copies that would in fact fit.',
      'form.updated': 'Drive updated.',
      'form.mounted': 'Drive {letter}: is ready and showing in Explorer.',
      'form.savedNotMounted': 'The drive was saved, but it could not be mounted: {error}',
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

      'settings.appearance': 'Appearance',
      'settings.theme': 'Theme',
      'settings.themeHint': 'System mode follows the Windows setting.',
      'settings.startup': 'Startup',
      'settings.startupHint': 'What the application does when it starts and when you close it.',
      'settings.startWithWindows': 'Start with Windows',
      'settings.startInBackground': 'Start in the background',
      'settings.mountOnOpen': 'Mount the automatic drives on opening',
      'settings.closeToTray': 'Keep running in the background when the window is closed',
      'settings.confirmUnmount': 'Ask for confirmation before unmounting',
      'settings.keys': 'Access keys',
      'settings.keysHint': 'The remote storage credentials, encrypted by Windows.',
      'settings.noDrivesUsing': 'Not used by any drive',
      'settings.noKeys': 'No keys stored yet. They are asked for when you create your first drive.',
      'settings.keyUpdated': 'Key updated.',
      'settings.keyInUse': 'Key in use',
      'settings.keysRemoved': 'Keys removed.',
      'settings.components': 'Components',
      'settings.componentsHint': 'What OmniMount installed so it can create drives.',
      'settings.allInstalled': 'Everything installed',
      'settings.componentMissing': 'A component is missing',
      'settings.engineMissing': 'Transfer engine not installed',
      'settings.driverMissing': 'Driver not installed',
      'settings.checking': 'Checking…',
      'settings.check': 'Check',
      'settings.installNow': 'Install now',
      'settings.allInstalledToast': 'All components are installed.',
      'settings.installedToast': 'Components installed.',
      'settings.maintenance': 'Maintenance',
      'settings.maintenanceHint': 'Where the application keeps its things.',
      'settings.dataFolder': 'Data folder',
      'settings.dataFolderHint': 'Settings and encrypted keys.',
      'settings.appLog': 'Application log',
      'settings.appLogHint': 'To send to support if something goes wrong.',
      'settings.dpapi': 'Windows DPAPI',
      'settings.cacheFolderHint': 'Files that have been opened or written. It cleans itself.',
      'cache.title': 'Local cache',
      'cache.description':
        'Files you open or write go through the disk. It is what makes the drive behave like a disk rather than a network folder.',
      'cache.reading': 'Checking the cache…',
      'cache.location': 'Where it is kept',
      'cache.onVolume': 'On {letter}: ({label}) · {free} free',
      'cache.change': 'Change',
      'cache.useDefault': 'Back to the default',
      'cache.size': 'How large it may get',
      'cache.automatic': 'Automatic',
      'cache.fixed': 'Fixed limit',
      'cache.sizeAutoHint':
        'Uses whatever is spare and lets go of the least used, always keeping {reserve} GB free on the disk.',
      'cache.sizeFixedHint':
        'Never goes past {limit} GB, and still keeps {reserve} GB free on the disk.',
      'cache.used': 'Currently using',
      'cache.usedHint': 'Clearing it touches nothing on the remote storage: it downloads again.',
      'cache.clear': 'Clear',
      'cache.clearTitle': 'Clear the cache?',
      'cache.clearMessage':
        'This removes the local copy of files that are already uploaded. Nothing on the remote storage is touched, and anything still waiting to upload is left alone.',
      'cache.cleared': 'Cache cleared for {count} drive(s).',
      'cache.alreadyEmpty': 'There was nothing to clear.',
      'cache.skippedMounted': '"{name}" is mounted, so its cache was left alone.',
      'cache.skippedPending':
        '"{name}" still has {count} file(s) waiting to upload. Its cache was left alone.',
      'cache.moved': 'The cache will be kept in the new location.',
      'cache.movedDefault': 'The cache is back in the application folder.',
      'cache.remountNeeded':
        'Drives that are already mounted keep using the previous folder until you mount them again.',

      'setup.preparandoOmnimount': 'Setting up OmniMount',
      'setup.unMomentoEstamosDejandolo': 'One moment, getting everything ready',
      'setup.listo': 'Ready',
      'setup.reintentar': 'Try again',
      'setup.motorDeTransferencia': 'Transfer engine',
      'setup.controladorDeUnidad': 'Drive driver',
      'setup.reinicioPendiente':
        'The driver is installed, but Windows only loads it after a restart. Restart the computer and open OmniMount again.',
      'setup.necesitaAdministrador':
        'The drive driver has to be installed once by whoever administers this computer: Windows asks for administrator credentials and this account does not have them.',
      'setup.permisoRechazado':
        'The Windows prompt has to be accepted to install the drive driver. Without it no drives can be created.',

      'elevation.kicker': 'Windows permissions',
      'elevation.title': 'Do not open OmniMount as administrator',
      'elevation.body':
        'Windows hides drives created by an elevated program from Explorer. The drives would mount and OmniMount would see them, but "This PC" would show nothing. Close it and open it with an ordinary double click.',
      'elevation.why':
        'OmniMount does not need administrator rights. The only component that does is the drive driver, and it asks for them on its own the first time.',
      'elevation.restart': 'Restart as a normal user',
      'elevation.restarting': 'Restarting…',
      'elevation.quit': 'Quit',
      'elevation.failed':
        'Could not restart automatically. Close OmniMount and open it again with an ordinary double click, not "Run as administrator".',
      'elevation.mountBlocked':
        'OmniMount is running as administrator and Windows would not show the drive in Explorer. Close it and open it with an ordinary double click.',

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

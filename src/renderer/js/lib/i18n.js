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
      /* --------------------------------- errores del proceso principal */
      'err.winfspMissing':
        'Falta el controlador de unidad. Instálalo desde Ajustes → Componentes.',
      'err.rcloneMissing':
        'Falta el motor de transferencia. Instálalo desde Ajustes → Componentes.',
      'err.dpapiUnavailable':
        'El cifrado de Windows no está disponible, así que no se puede guardar la clave de forma segura.',
      'err.cacheNetwork':
        'Esa es una unidad de red: cada byte cacheado volvería a viajar por el cable. Elige un disco local.',
      'err.cacheOptical': 'Esa es una unidad óptica. Elige un disco local.',
      'err.cacheRemovable':
        'Esa es una unidad extraíble y no siempre estará conectada. Elige un disco fijo.',
      'err.cacheFilesystem':
        'Ese disco no admite ficheros dispersos (FAT o exFAT), y la caché iría a rastras. Elige un disco NTFS.',
      'err.cacheOwnMount':
        'Esa letra la sirve OmniMount: la caché se estaría escribiendo dentro de la unidad a la que alimenta.',
      'err.cacheNotWritable': 'No se puede escribir en esa carpeta.',
      'err.cacheUnreadable': 'No se pudo leer el tamaño de ese disco.',
      'err.cacheUnknown': 'No se reconoce ese disco.',

      /* ------------------------------------------ barrido de traduccion */
      'drives.noneConfigured': 'Todavía no hay ninguna unidad configurada.',
      'drives.statCache': 'Caché local',
      'drives.statMoved': '{bytes} movidos',
      'drives.automatic': 'Automática',
      'drives.refreshDirCache': 'Vaciar caché de directorios',
      'drives.mountedTitle': 'Montada',
      'drives.mountedBody': 'La unidad {letter}: está disponible.',
      'drives.unmountTitle': '¿Desmontar {letter}:?',
      'drives.unmountMessage': 'Se cerrará la unidad «{name}».',
      'drives.unmountPending':
        'Hay {count} subida(s) pendientes. Se intentará completarlas antes de cerrar.',
      'drives.unmountWarning':
        'Los programas que tengan ficheros abiertos en esa unidad perderán el acceso.',
      'drives.dirCacheCleared': 'Caché de directorios vaciada.',
      'drives.allMounted': 'Todas las unidades están ya montadas.',
      'drives.deleteTitle': '¿Eliminar «{name}»?',

      'explorer.colSize': 'Tamaño',
      'explorer.folderSummary': '{folders} carpeta(s) · {files} fichero(s) · {bytes}',
      'explorer.deleteTitle': '¿Eliminar {count} elemento(s)?',
      'explorer.deleteWithFolders':
        'Entre ellos hay {count} carpeta(s); se borrará todo su contenido.',
      'explorer.deleteFiles': 'Los ficheros se eliminarán del almacenamiento remoto.',
      'explorer.renameFolderTitle': 'No disponible aquí',
      'explorer.renameFolderBody':
        'Renombrar una carpeta exigiría copiar todos sus objetos. Hazlo desde la unidad montada.',
      'explorer.usageSummary': '{count} objeto(s) · {bytes} en total bajo este prefijo',

      'logs.emptyDrive': 'Esta unidad no ha registrado nada en esta sesión.',
      'logs.emptyFilter': 'No hay líneas que encajen con el filtro.',
      'logs.copied': '{count} línea(s) copiadas.',
      'logs.clipboardUnavailable': 'El portapapeles no está disponible.',

      'setup.installingBody':
        'Se están instalando los componentes que necesita la aplicación. Esto sólo ocurre la primera vez.',
      'setup.uacNotice':
        'Windows pedirá permiso de administrador para instalar el controlador. Es necesario para crear unidades.',
      'setup.failed': 'No se pudo completar la preparación.',

      /* ---------------------------------------------------------- cache */
      /* ----------------------------------------------- actualizaciones */
      'update.availableTitle': 'Hay una versión nueva',
      'update.availableDesc':
        'OmniMount {version} ya está disponible. Al instalarla se desmontan las unidades y la aplicación se reinicia sola.',
      'update.dontShowAgain': 'No volver a mostrar',
      'update.dontShowAgainHint':
        'No se volverá a avisar de la {version}. De una versión posterior sí.',
      'update.later': 'Más tarde',
      'update.updateNow': 'Actualizar ahora',
      'update.restartAndInstall': 'Reiniciar e instalar',
      'update.downloading': 'Descargando la actualización…',
      'update.installing': 'Instalando. La aplicación se reiniciará.',
      'update.progress': '{percent}% · {done} de {total} · {speed}',
      'update.progressPlain': 'Descargando… {percent}%',
      'update.failed': 'No se pudo completar la actualización.',
      'update.close': 'Cerrar',
      'update.checking': 'Comprobando si hay una versión nueva…',
      'update.checkNow': 'Comprobar ahora',
      'update.foundVersion': 'Disponible la versión {version}.',
      'update.readyToInstall': 'La versión {version} está descargada y lista.',
      'update.upToDate': 'Estás en la última versión ({version}).',
      'update.neverChecked': 'Versión {version}. Se comprueba al abrir y cada hora.',
      'update.notPackaged': 'Ejecutándose desde el código: no hay nada que actualizar.',

      'settings.updates': 'Actualizaciones',
      'settings.updatesHint':
        'Se comprueba al abrir la aplicación y una vez por hora. Nada se instala sin que lo pidas.',
      'settings.updateStatus': 'Estado',
      'settings.updateNotify': 'Avisarme de las versiones nuevas',
      'settings.updateNotifyHint':
        'Si lo apagas se sigue comprobando, pero sin avisos: la versión encontrada aparece aquí.',
      'settings.updateSkipped': 'Versión descartada',
      'settings.updateSkippedHint': 'Dijiste que no querías volver a ver el aviso de la {version}.',
      'settings.updateUnskip': 'Volver a avisar',

      /* ------------------------------------------- estado de la ventana */
      'status.noneMounted': 'Sin unidades montadas',
      'status.oneMounted': '{count} unidad montada',
      'status.manyMounted': '{count} unidades montadas',
      'status.withError': '{count} con error',
      'status.working': 'Trabajando…',
      'explorer.subtitle':
        'Navega por el almacenamiento sin montar la unidad. Las operaciones van directas al servidor remoto.',
      'logs.subtitle':
        'La salida de rclone para cada unidad. Es el primer sitio donde mirar cuando un montaje falla.',
      'settings.engineVersion': 'Motor {version}',
      'settings.driverVersion': 'Controlador {version}',

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
      /* ------------------------------------------------------- perfiles */
      'cache.profile': 'Perfil',
      'cache.profileName.performance': 'Rendimiento',
      'cache.profileName.balanced': 'Equilibrado',
      'cache.profileName.lowfootprint': 'Mínima huella',
      'cache.profileName.custom': 'Personalizado',
      'cache.profileHint.performance':
        'Recomendado. Guarda lo que abres un mes y confía en los listados cinco minutos, así que volver a algo con lo que ya has trabajado es casi instantáneo. La primera descarga la marca tu conexión, no este ajuste. A cambio deja más cosas en el disco y durante más tiempo.',
      'cache.profileHint.balanced':
        'Lo mismo con una semana de retención en vez de un mes. Menos huella en el disco, algún acierto de caché menos.',
      'cache.profileHint.lowfootprint':
        'Para un equipo compartido: lo que lees no se guarda nunca en el disco, sólo lo que escribes, y eso se suelta en un día. Volver a abrir lo mismo se paga: medido unas nueve veces más lento en una carpeta de ficheros pequeños.',
      'cache.profileHint.custom': 'Tus propios valores. Cada campo lleva al lado lo que hace.',

      'cache.mode.full': 'full (lectura y escritura)',
      'cache.mode.writes': 'writes (sólo escritura)',

      /* resumen del perfil activo */
      'cache.sumMode': 'modo {mode}',
      'cache.sumKeptDays': 'se guarda {days} día(s)',
      'cache.sumKeptForever': 'se guarda hasta que haga falta el disco',
      'cache.sumStreams': '{streams} flujos de {size} MB en paralelo',
      'cache.sumStreamsOff': 'un flujo desde {size} MB, creciendo',
      'cache.sumReadAhead': '{mb} MB de lectura adelantada',
      'cache.sumTransfers': '{transfers} transferencias a la vez',
      'cache.sumListings': 'listados válidos {seconds} s',

      /* editor del perfil personalizado */
      'cache.field.cacheMode': 'Modo de caché',
      'cache.fieldHint.cacheMode':
        '«full» hace que la unidad se comporte como un disco. «writes» no guarda las lecturas: menos huella, más descargas.',
      'cache.field.retentionDays': 'Días que se guarda',
      'cache.fieldHint.retentionDays':
        'Desde la última vez que se usó el fichero. 0 = no se suelta por antigüedad, sólo cuando haga falta espacio.',
      'cache.field.readChunkStreams': 'Flujos en paralelo',
      'cache.fieldHint.readChunkStreams':
        'Trozos que se descargan a la vez de un mismo fichero. En pruebas sobre un enlace rápido no se notó diferencia entre 0, 4 y 16; está aquí porque sí ayuda cuando la latencia es alta. 0 = uno detrás de otro.',
      'cache.field.readChunkSizeMB': 'Tamaño de trozo (MB)',
      'cache.fieldHint.readChunkSizeMB':
        'Con flujos en paralelo conviene que sea pequeño; con un solo flujo empieza aquí y va doblando.',
      'cache.field.readAheadMB': 'Lectura adelantada (MB)',
      'cache.fieldHint.readAheadMB':
        'Cuánto se adelanta a lo que pides, guardándolo en disco. Sólo aplica en modo «full».',
      'cache.field.dirCacheSeconds': 'Listados válidos (s)',
      'cache.fieldHint.dirCacheSeconds':
        'Cuánto vale un listado de carpeta antes de volver a preguntar. Más alto es navegar más rápido y ver más tarde los cambios que haga otro.',
      'cache.field.transfers': 'Transferencias',
      'cache.fieldHint.transfers': 'Subidas y bajadas simultáneas.',
      'cache.field.checkers': 'Comprobadores',
      'cache.fieldHint.checkers': 'Comprobaciones de metadatos en paralelo.',
      'cache.field.writeBackSeconds': 'Espera antes de subir (s)',
      'cache.fieldHint.writeBackSeconds':
        'Tras cerrar un fichero. Más alto agrupa varias ediciones seguidas en una sola subida.',
      'cache.field.handleCachingSeconds': 'Mantener abierto (s)',
      'cache.fieldHint.handleCachingSeconds':
        'Tiempo que se conserva el fichero abierto tras cerrarlo. Si se vuelve a abrir dentro de ese rato, no hay que montar la descarga otra vez.',
      'cache.field.fastFingerprint': 'Comprobación rápida de cambios',
      'cache.fieldHint.fastFingerprint':
        'Decide si la copia local sigue valiendo sin pedir el hash, que es una petición más por fichero.',
      'cache.chooseTitle': 'Dónde guardar la caché',
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
      /* ------------------------------------- main process error codes */
      'err.winfspMissing':
        'The drive driver is missing. Install it from Settings → Components.',
      'err.rcloneMissing':
        'The transfer engine is missing. Install it from Settings → Components.',
      'err.dpapiUnavailable':
        'Windows encryption is unavailable, so the key cannot be stored safely.',
      'err.cacheNetwork':
        'That is a network drive: every cached byte would travel back over the wire. Pick a local disk.',
      'err.cacheOptical': 'That is an optical drive. Pick a local disk.',
      'err.cacheRemovable':
        'That is a removable drive and will not always be plugged in. Pick a fixed disk.',
      'err.cacheFilesystem':
        'That disk has no sparse file support (FAT or exFAT) and the cache would crawl. Pick an NTFS disk.',
      'err.cacheOwnMount':
        'OmniMount serves that letter: the cache would be writing inside the drive it is feeding.',
      'err.cacheNotWritable': 'That folder cannot be written to.',
      'err.cacheUnreadable': 'The size of that disk could not be read.',
      'err.cacheUnknown': 'That disk is not recognised.',

      /* --------------------------------------------- translation sweep */
      'drives.noneConfigured': 'No drives have been set up yet.',
      'drives.statCache': 'Local cache',
      'drives.statMoved': '{bytes} moved',
      'drives.automatic': 'Automatic',
      'drives.refreshDirCache': 'Clear directory cache',
      'drives.mountedTitle': 'Mounted',
      'drives.mountedBody': 'Drive {letter}: is ready.',
      'drives.unmountTitle': 'Unmount {letter}:?',
      'drives.unmountMessage': 'The drive "{name}" will be closed.',
      'drives.unmountPending':
        '{count} upload(s) are still pending. They will be finished before closing if possible.',
      'drives.unmountWarning':
        'Any program with files open on that drive will lose access to them.',
      'drives.dirCacheCleared': 'Directory cache cleared.',
      'drives.allMounted': 'Every drive is already mounted.',
      'drives.deleteTitle': 'Delete "{name}"?',

      'explorer.colSize': 'Size',
      'explorer.folderSummary': '{folders} folder(s) · {files} file(s) · {bytes}',
      'explorer.deleteTitle': 'Delete {count} item(s)?',
      'explorer.deleteWithFolders':
        '{count} of them are folders; everything inside will be deleted too.',
      'explorer.deleteFiles': 'The files will be removed from the remote storage.',
      'explorer.renameFolderTitle': 'Not available here',
      'explorer.renameFolderBody':
        'Renaming a folder would mean copying every object inside it. Do it from the mounted drive.',
      'explorer.usageSummary': '{count} object(s) · {bytes} in total under this prefix',

      'logs.emptyDrive': 'This drive has not logged anything this session.',
      'logs.emptyFilter': 'No lines match the filter.',
      'logs.copied': '{count} line(s) copied.',
      'logs.clipboardUnavailable': 'The clipboard is not available.',

      'setup.installingBody':
        'The components the application needs are being installed. This only happens the first time.',
      'setup.uacNotice':
        'Windows will ask for administrator permission to install the driver. It is needed to create drives.',
      'setup.failed': 'Setting up could not be completed.',

      /* --------------------------------------------------------- updates */
      'update.availableTitle': 'A new version is available',
      'update.availableDesc':
        'OmniMount {version} is out. Installing it unmounts your drives and restarts the application by itself.',
      'update.dontShowAgain': 'Do not show again',
      'update.dontShowAgainHint':
        'You will not be told about {version} again. A later version still asks.',
      'update.later': 'Later',
      'update.updateNow': 'Update now',
      'update.restartAndInstall': 'Restart and install',
      'update.downloading': 'Downloading the update…',
      'update.installing': 'Installing. The application will restart.',
      'update.progress': '{percent}% · {done} of {total} · {speed}',
      'update.progressPlain': 'Downloading… {percent}%',
      'update.failed': 'The update could not be completed.',
      'update.close': 'Close',
      'update.checking': 'Checking for a new version…',
      'update.checkNow': 'Check now',
      'update.foundVersion': 'Version {version} is available.',
      'update.readyToInstall': 'Version {version} is downloaded and ready.',
      'update.upToDate': 'You are on the latest version ({version}).',
      'update.neverChecked': 'Version {version}. Checked when the app opens and once an hour.',
      'update.notPackaged': 'Running from source: there is nothing to update.',

      'settings.updates': 'Updates',
      'settings.updatesHint':
        'Checked when the application opens and once an hour. Nothing installs unless you ask for it.',
      'settings.updateStatus': 'Status',
      'settings.updateNotify': 'Tell me about new versions',
      'settings.updateNotifyHint':
        'Switched off, the checks carry on without the notice: whatever is found still shows here.',
      'settings.updateSkipped': 'Dismissed version',
      'settings.updateSkippedHint': 'You asked not to see the notice for {version} again.',
      'settings.updateUnskip': 'Notify me again',

      /* ------------------------------------------------- titlebar status */
      'status.noneMounted': 'No drives mounted',
      'status.oneMounted': '{count} drive mounted',
      'status.manyMounted': '{count} drives mounted',
      'status.withError': '{count} with an error',
      'status.working': 'Working…',
      'explorer.subtitle':
        'Browse the storage without mounting a drive. Everything here goes straight to the remote server.',
      'logs.subtitle':
        "rclone's own output for each drive. The first place to look when a mount fails.",
      'settings.engineVersion': 'Engine {version}',
      'settings.driverVersion': 'Driver {version}',

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
      /* -------------------------------------------------------- profiles */
      'cache.profile': 'Profile',
      'cache.profileName.performance': 'Performance',
      'cache.profileName.balanced': 'Balanced',
      'cache.profileName.lowfootprint': 'Minimal footprint',
      'cache.profileName.custom': 'Custom',
      'cache.profileHint.performance':
        'Recommended. Keeps what you open for a month and trusts listings for five minutes, so going back to something you have already worked on is near instant. The first download is set by your connection, not by this setting. In exchange it leaves more on the disk, for longer.',
      'cache.profileHint.balanced':
        'The same with a week of retention instead of a month. Less left on the disk, a few cache hits fewer.',
      'cache.profileHint.lowfootprint':
        'For a shared computer: what you read is never written to the disk, only what you save, and that goes within a day. Reopening the same files costs you: measured about nine times slower on a folder of small files.',
      'cache.profileHint.custom': 'Your own figures. Each field says what it does.',

      'cache.mode.full': 'full (reads and writes)',
      'cache.mode.writes': 'writes (writes only)',

      /* summary of the active profile */
      'cache.sumMode': '{mode} mode',
      'cache.sumKeptDays': 'kept {days} day(s)',
      'cache.sumKeptForever': 'kept until the disk is needed',
      'cache.sumStreams': '{streams} parallel streams of {size} MB',
      'cache.sumStreamsOff': 'one stream from {size} MB, doubling',
      'cache.sumReadAhead': '{mb} MB read ahead',
      'cache.sumTransfers': '{transfers} transfers at once',
      'cache.sumListings': 'listings good for {seconds}s',

      /* custom profile editor */
      'cache.field.cacheMode': 'Cache mode',
      'cache.fieldHint.cacheMode':
        '"full" makes the drive behave like a disk. "writes" does not keep what you read: less left behind, more downloading.',
      'cache.field.retentionDays': 'Days it is kept',
      'cache.fieldHint.retentionDays':
        'Counted from the last time the file was used. 0 = never dropped for being old, only when space is needed.',
      'cache.field.readChunkStreams': 'Parallel streams',
      'cache.fieldHint.readChunkStreams':
        'Chunks of the same file downloaded at once. Testing over a fast link showed no difference between 0, 4 and 16; it is here because it does help when latency is high. 0 = one after another.',
      'cache.field.readChunkSizeMB': 'Chunk size (MB)',
      'cache.fieldHint.readChunkSizeMB':
        'With parallel streams this wants to be small; with a single stream it starts here and doubles.',
      'cache.field.readAheadMB': 'Read ahead (MB)',
      'cache.fieldHint.readAheadMB':
        'How far ahead of what you asked for it reads, buffered on disk. Only applies in "full" mode.',
      'cache.field.dirCacheSeconds': 'Listings good for (s)',
      'cache.fieldHint.dirCacheSeconds':
        'How long a folder listing is trusted before asking again. Higher means faster browsing and later notice of what someone else changed.',
      'cache.field.transfers': 'Transfers',
      'cache.fieldHint.transfers': 'Simultaneous uploads and downloads.',
      'cache.field.checkers': 'Checkers',
      'cache.fieldHint.checkers': 'Metadata checks run in parallel.',
      'cache.field.writeBackSeconds': 'Wait before uploading (s)',
      'cache.fieldHint.writeBackSeconds':
        'After a file is closed. Higher gathers several edits in a row into one upload.',
      'cache.field.handleCachingSeconds': 'Keep open for (s)',
      'cache.fieldHint.handleCachingSeconds':
        'How long a file is held open after it is closed. Reopening inside that window skips setting the download up again.',
      'cache.field.fastFingerprint': 'Fast change detection',
      'cache.fieldHint.fastFingerprint':
        'Decides whether the local copy is still valid without asking for the hash, which is another request per file.',
      'cache.chooseTitle': 'Where to keep the cache',
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

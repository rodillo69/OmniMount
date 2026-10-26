# OmniMount

Monta almacenamiento remoto como una unidad más de Windows.

Eliges a qué te conectas, pones tus credenciales y aparece en el Explorador
con su letra de unidad. Copias, abres y guardas como en cualquier disco: no
hay nada que sincronizar ni que subir a mano.

*[Read this in English](README.md)*

---

## Descarga

**[Descargar OmniMount 1.0.0 para Windows](https://github.com/rodillo69/OmniMount/releases/latest/download/OmniMount-Setup-1.0.0.exe)** · 116 MB · Windows 10 u 11, 64 bits

La versión más reciente está siempre en la [página de versiones](https://github.com/rodillo69/OmniMount/releases/latest).
Una vez instalado, el programa se actualiza solo.

> **Windows te avisará la primera vez.**
> El instalador no está firmado con un certificado comercial, así que
> SmartScreen muestra *«Windows protegió su PC»*. Pulsa **Más información →
> Ejecutar de todas formas**. Es lo que Windows enseña ante cualquier programa
> sin certificado de pago; no es un juicio sobre el archivo. Las
> actualizaciones posteriores se instalan sin ese aviso.

---

## Con qué funciona

Unos 45 tipos de almacenamiento, porque la lista la da
[rclone](https://rclone.org) y no está escrita a mano:

| | |
|---|---|
| **Almacenamiento de objetos** | Amazon S3, Backblaze B2, Wasabi, MinIO, Ceph, DigitalOcean Spaces, Cloudflare R2, Azure Blob, OpenStack Swift y cualquier otro servicio compatible con S3 |
| **Servidores** | SFTP, FTP, WebDAV, SMB, HTTP |
| **Discos alojados** | Mega, pCloud, Storj, Filen y otros |

El formulario se adapta a lo que elijas: un servidor SFTP pide servidor y
usuario, un servicio S3 pide dirección y claves. Las opciones que no aplican a
tu proveedor ni siquiera aparecen.

Los servicios que exigen iniciar sesión en el navegador —Google Drive,
Dropbox, OneDrive— todavía no están, porque ese flujo no está implementado.

---

## Primer arranque

OmniMount necesita dos componentes, y los instala él mismo la primera vez que
lo abres:

- **rclone**, que es quien habla con el almacenamiento. Se descarga en tu
  carpeta de usuario.
- **WinFsp**, el controlador que permite que un programa se presente como una
  unidad. Windows pedirá permiso de administrador una vez, para esto.

No hace falta nada más, y ninguno de los dos va empaquetado dentro, así que
siempre tendrás una versión actual.

---

## Tus credenciales

Las claves y contraseñas se cifran con DPAPI de Windows a través de
`safeStorage` de Electron, que las ata a tu cuenta: otra cuenta del mismo
equipo no puede leerlas.

Nunca se escriben en un fichero de configuración de rclone. Cada unidad lanza
su propio proceso y recibe sus ajustes por variables de entorno, porque la
línea de comandos de un proceso la puede leer cualquier otro programa del
equipo y el bloque de entorno no. Las contraseñas que rclone exige ofuscadas
pasan por `rclone obscure` a través de una tubería, nunca como argumento.

---

## Compilarlo tú

```bash
git clone https://github.com/rodillo69/OmniMount.git
cd OmniMount
npm install
npm start          # ejecutarlo
npm run dist       # generar el instalador en dist/
```

Necesita Node.js 20 o superior. El instalador sale sin firmar salvo que
definas `OMNIMOUNT_SIGN_SUBJECT` u `OMNIMOUNT_SIGN_CERT_FILE`.

---

## Qué está verificado y qué no

Esto importa más que una lista de funciones bien presentada:

- **S3** está probado de punta a punta contra un servicio real: montar,
  listar, leer, escribir, borrar y desmontar, además de comprobar que unas
  credenciales se rechazan correctamente contra el servidor equivocado.
- **Los demás backends** comparten el mismo camino de código —sólo cambian los
  ajustes que se le pasan a rclone— pero no se ha probado cada uno contra un
  servidor real. Si alguno falla, abre una incidencia.
- **macOS y Linux** no están soportados. La capa de montaje está separada del
  resto para poder añadirlos, pero no hay nada hecho.

---

## Licencia

GPL-3.0. Ver [LICENSE](LICENSE).

Construido sobre [rclone](https://rclone.org) (MIT) y
[WinFsp](https://winfsp.dev) (GPLv3), que no se modifican ni se redistribuyen
aquí: ambos se descargan de sus propios proyectos en el primer arranque.

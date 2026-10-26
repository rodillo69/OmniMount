# OmniMount

Mount remote storage as an ordinary Windows drive.

Pick what you are connecting to, enter your credentials, and it appears in
Explorer with a drive letter. Copy, open and save files the way you would on
any disk — there is nothing to sync and nothing to upload by hand.

*[Léeme en castellano](README.es.md)*

---

## Download

**[Download OmniMount 1.0.0 for Windows](https://github.com/rodillo69/OmniMount/releases/latest/download/OmniMount-Setup-1.0.0.exe)** · 116 MB · Windows 10 or 11, 64-bit

The newest version is always on the [releases page](https://github.com/rodillo69/OmniMount/releases/latest).
Once installed, the app updates itself.

> **Windows will warn you the first time.**
> The installer is not signed with a commercial certificate, so SmartScreen
> shows *"Windows protected your PC"*. Choose **More info → Run anyway**. This
> is what Windows shows for any program without a paid certificate; it is not
> a verdict about the file. Later updates install without the warning.

---

## What it works with

Around 45 kinds of storage, because the list comes from
[rclone](https://rclone.org) rather than being written by hand:

| | |
|---|---|
| **Object storage** | Amazon S3, Backblaze B2, Wasabi, MinIO, Ceph, DigitalOcean Spaces, Cloudflare R2, Azure Blob, OpenStack Swift, and any other S3-compatible service |
| **Servers** | SFTP, FTP, WebDAV, SMB, HTTP |
| **Hosted drives** | Mega, pCloud, Storj, Filen, and others |

The form adapts to what you choose: an SFTP server asks for a host and a user,
an S3 service asks for an endpoint and keys. Options that do not apply to your
provider are not shown at all.

Services that need a browser sign-in — Google Drive, Dropbox, OneDrive — are
not included yet, because that flow is not implemented.

---

## First run

OmniMount needs two components, and installs them itself the first time you
open it:

- **rclone**, which talks to the storage. Downloaded to your user folder.
- **WinFsp**, the driver that lets a program present itself as a drive.
  Windows will ask for administrator permission once, for this.

Nothing else is required, and neither component is bundled, so you always get
a current version.

---

## Your credentials

Keys and passwords are encrypted with Windows DPAPI through Electron's
`safeStorage`, which ties them to your Windows account: another account on the
same computer cannot read them.

They are never written to an rclone configuration file. Each drive runs its
own rclone process and receives its settings through environment variables,
because a process command line is readable by anything else on the machine
while an environment block is not. Passwords that rclone requires to be
obscured are passed through `rclone obscure` over a pipe, never as an
argument.

---

## Building it yourself

```bash
git clone https://github.com/rodillo69/OmniMount.git
cd OmniMount
npm install
npm start          # run it
npm run dist       # build the installer into dist/
```

Requires Node.js 20 or newer. The build produces an unsigned installer unless
you set `OMNIMOUNT_SIGN_SUBJECT` or `OMNIMOUNT_SIGN_CERT_FILE`.

---

## What is verified, and what is not

Being honest about this matters more than a tidy feature list:

- **S3** is tested end to end against a live service: mount, list, read,
  write, delete and unmount, plus credentials correctly rejected when used
  against the wrong server.
- **The other backends** share the same code path — only the settings handed
  to rclone differ — but they have not each been exercised against a real
  server. If one misbehaves, please open an issue.
- **macOS and Linux** are not supported. The mount layer is kept separate from
  the rest so they could be added, but no work has been done on it.

---

## Licence

GPL-3.0. See [LICENSE](LICENSE).

Built on [rclone](https://rclone.org) (MIT) and
[WinFsp](https://winfsp.dev) (GPLv3), neither of which is modified or
redistributed here: both are downloaded from their own projects on first run.

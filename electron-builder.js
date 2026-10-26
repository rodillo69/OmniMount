/**
 * Packaging configuration.
 *
 * It lives in a .js file rather than in package.json because signing needs to
 * read environment variables: a certificate never belongs in the repository.
 *
 * Without a certificate the installer is still produced; the only difference
 * is that Windows shows a SmartScreen warning when it runs.
 *
 * The file is named electron-builder.js, not electron-builder.config.js,
 * because only the former is discovered automatically. With the wrong name the
 * build still succeeds but silently ignores every setting here.
 */
'use strict';

const AUTHOR = 'Miguel Cañadas';

function signing() {
  const subject = process.env.OMNIMOUNT_SIGN_SUBJECT;
  const certFile = process.env.OMNIMOUNT_SIGN_CERT_FILE;

  if (!subject && !certFile) return undefined;

  const options = {
    // Without a timestamp the signature stops validating the day the
    // certificate expires, and installers already handed out start warning.
    rfc3161TimeStampServer:
      process.env.OMNIMOUNT_SIGN_TIMESTAMP || 'http://timestamp.digicert.com',
    signingHashAlgorithms: ['sha256'],
    publisherName: process.env.OMNIMOUNT_SIGN_PUBLISHER || AUTHOR,
  };

  if (subject) options.certificateSubjectName = subject;
  if (certFile) {
    options.certificateFile = certFile;
    options.certificatePassword = process.env.OMNIMOUNT_SIGN_CERT_PASSWORD;
  }

  return { signtoolOptions: options };
}

const sign = signing();
console.log(sign ? `[sign] enabled for "${sign.signtoolOptions.publisherName}"` : '[sign] unsigned build');

module.exports = {
  appId: 'io.github.rodillo69.omnimount',
  productName: 'OmniMount',
  copyright: `© ${new Date().getFullYear()} ${AUTHOR}`,
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  files: ['src/**/*', '!**/*.map'],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.png',
    artifactName: 'OmniMount-Setup-${version}.${ext}',
    ...sign,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    // Per-user install needs no administrator rights. Only the filesystem
    // driver does, and that is requested once, on first run.
    perMachine: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'OmniMount',
    uninstallDisplayName: 'OmniMount',
  },
  publish: [
    {
      provider: 'github',
      owner: 'rodillo69',
      repo: 'OmniMount',
    },
  ],
};

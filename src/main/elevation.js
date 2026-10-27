'use strict';

/**
 * What Windows will and will not let this process do, read once at startup.
 *
 * This decides whether OmniMount can work at all, and it is worth explaining
 * why. WinFsp publishes a drive letter with DefineDosDevice, and Windows keeps
 * a *separate* DOS device table for each elevation level of a logon session.
 * A letter created by an elevated process therefore does not exist for the
 * ordinary, unelevated Explorer the user is actually looking at.
 *
 * The result is the worst kind of failure: rclone mounts, the app can read the
 * drive perfectly well through its own elevated handle, every check passes —
 * and "This PC" shows nothing. The app reports success and the user is staring
 * at an empty window.
 *
 * rclone documents the same caveat, and the escape hatch: the EnableLinkedConnections
 * policy makes Windows publish the letter into both tables. If it is on,
 * running elevated is harmless. If it is off, running elevated is useless, so
 * OmniMount says so up front instead of mounting into a letter nobody can
 * open.
 */

const { execFile } = require('node:child_process');
const path = require('node:path');
const { app } = require('electron');
const log = require('./logger').scoped('elevation');

const LINKED_CONNECTIONS_KEY =
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';

// One PowerShell call answers all three questions, so the cost is paid once.
//
// `IsInRole(Administrator)` is true only for a token that is actually
// elevated, which is exactly the question that matters.
//
// Membership of the Administrators group is read from `whoami /groups` and not
// from the .NET identity, because an unelevated token carries that group as
// "deny only" and WindowsIdentity.Groups leaves deny-only SIDs out. The
// difference is the difference between a UAC prompt the user can accept and
// one that demands someone else's password.
const PROBE = [
  '$id = [Security.Principal.WindowsIdentity]::GetCurrent();',
  '$principal = New-Object Security.Principal.WindowsPrincipal($id);',
  '$elevated = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);',
  '$inAdmins = @(whoami /groups) -match "S-1-5-32-544";',
  '$linked = 0;',
  'try {',
  `  $linked = [int](Get-ItemProperty '${LINKED_CONNECTIONS_KEY}'`,
  '    -Name EnableLinkedConnections -ErrorAction Stop).EnableLinkedConnections',
  '} catch { }',
  '[pscustomobject]@{',
  '  elevated = [bool]$elevated;',
  '  canElevate = [bool]$inAdmins;',
  '  linkedConnections = ($linked -eq 1)',
  '} | ConvertTo-Json -Compress',
].join(' ');

// Assumed before the probe answers, and kept if it fails. Claiming "not
// elevated" on a failed read is the safe default: it lets the app run, and a
// mount that then turns out to be invisible is caught by the check that
// actually reads the drive back.
const UNKNOWN = { elevated: false, canElevate: false, linkedConnections: false, known: false };

let cached = null;

function probe() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PROBE],
      { timeout: 15000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          log.warn('Could not read the elevation state:', err.message);
          return resolve({ ...UNKNOWN });
        }
        try {
          const parsed = JSON.parse(String(stdout).trim());
          resolve({
            elevated: Boolean(parsed.elevated),
            canElevate: Boolean(parsed.canElevate),
            linkedConnections: Boolean(parsed.linkedConnections),
            known: true,
          });
        } catch (parseError) {
          log.warn('Unreadable elevation probe output:', parseError.message);
          resolve({ ...UNKNOWN });
        }
      }
    );
  });
}

/**
 * Read the state, once per run.
 *
 * `--fake-elevated` forces the elevated answer in a development build. The
 * screen it leads to cannot be reached any other way without an account that
 * can elevate, and a blocking screen nobody has ever seen is a blocking
 * screen nobody has tested. Ignored in a packaged build.
 */
async function read() {
  if (!cached) {
    if (!app.isPackaged && process.argv.includes('--fake-elevated')) {
      cached = { elevated: true, canElevate: true, linkedConnections: false, known: true };
      log.warn('Elevation forced by --fake-elevated; this is a development switch.');
    } else {
      cached = await probe();
    }
  }
  return cached;
}

/** The last known state, without waiting. Used where blocking is not an option. */
function current() {
  return cached || { ...UNKNOWN };
}

/**
 * Whether a drive this process mounts will be visible to the user's Explorer.
 *
 * False only in the one combination that breaks: elevated, with linked
 * connections off.
 */
function mountsAreVisible(state = current()) {
  return !state.elevated || state.linkedConnections;
}

/**
 * Start a fresh, unelevated copy and let this one go.
 *
 * A process cannot drop its own elevation, so the relaunch goes through
 * Explorer: it runs at the ordinary integrity level, and a program it starts
 * inherits that rather than this process's elevated token. `explorer.exe
 * <path>` hands the request to the already-running Explorer and returns at
 * once, which is why the exit code is ignored — it says nothing about whether
 * the new copy started.
 */
function relaunchUnelevated() {
  const exe = app.getPath('exe');
  return new Promise((resolve, reject) => {
    // Electron's own relaunch would inherit this token, so Explorer has to be
    // the one that starts it.
    execFile('explorer.exe', [exe], { windowsHide: true, cwd: path.dirname(exe) }, (err) => {
      // Explorer reports a non-zero status even when it has done the job.
      if (err && err.code === 'ENOENT') return reject(err);
      resolve(true);
    });
  });
}

module.exports = { read, current, mountsAreVisible, relaunchUnelevated };

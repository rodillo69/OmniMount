; Custom NSIS fragment, picked up automatically from the build resources.
;
; OmniMount installs for the user who runs the installer, and only for them.
; The "who should this be installed for" page is skipped rather than
; defaulted, because the all-users answer is wrong for this program in a way
; that is not obvious from the page: it installs into Program Files, which
; means the installer elevates, and it buys nothing — the drives themselves
; are per-user anyway, since a mounted drive letter belongs to the logon
; session that created it. There is no "install a drive for everyone".
;
; electron-builder's install-mode page calls this macro before it decides
; what to show. Setting the flag makes it choose the current user and abort
; the page, so the wizard goes straight from the welcome screen to the
; install location.

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

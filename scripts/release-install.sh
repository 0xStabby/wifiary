#!/usr/bin/env bash
set -euo pipefail

SCOPE="user"
INSTALL_POLKIT="yes"
INSTALL_DESKTOP="yes"
PASSWORDLESS_WHEEL="no"

usage() {
  cat <<'EOF'
WiFiary release installer

Usage:
  bash scripts/release-install.sh [--system] [--no-polkit] [--no-desktop] [--passwordless-wheel]

Installs prebuilt release files from an extracted WiFiary release archive.

Defaults:
  - App binary: ~/.local/bin/wifiary
  - Desktop entry + icon: user application/icon directories
  - Helper binary: /usr/lib/wifiary/wifiary-helper
  - PolicyKit action: /usr/share/polkit-1/actions/org.wifiary.helper.policy

Options:
  --system               Install app binary, desktop entry, and icon system-wide.
  --no-polkit            Skip privileged helper and PolicyKit installation.
  --no-desktop           Skip desktop entry and icon installation.
  --passwordless-wheel   Install the optional wheel-group passwordless PolicyKit rule.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system)
      SCOPE="system"
      shift
      ;;
    --no-polkit)
      INSTALL_POLKIT="no"
      shift
      ;;
    --no-desktop)
      INSTALL_DESKTOP="no"
      shift
      ;;
    --passwordless-wheel)
      PASSWORDLESS_WHEEL="yes"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SRC="$ROOT_DIR/bin/wifiary"
HELPER_SRC="$ROOT_DIR/bin/wifiary-helper"

if [[ ! -f "$APP_SRC" ]]; then
  echo "Missing app binary: $APP_SRC" >&2
  echo "Run this script from an extracted WiFiary release archive." >&2
  exit 1
fi

if [[ "$INSTALL_POLKIT" == "yes" && ! -f "$HELPER_SRC" ]]; then
  echo "Missing helper binary: $HELPER_SRC" >&2
  echo "Run this script from an extracted WiFiary release archive." >&2
  exit 1
fi

if [[ "$SCOPE" == "system" ]]; then
  echo "Installing app binary -> /usr/local/bin/wifiary"
  sudo install -Dm755 "$APP_SRC" /usr/local/bin/wifiary
else
  echo "Installing app binary -> $HOME/.local/bin/wifiary"
  install -Dm755 "$APP_SRC" "$HOME/.local/bin/wifiary"
fi

if [[ "$INSTALL_DESKTOP" == "yes" ]]; then
  if [[ "$SCOPE" == "system" ]]; then
    bash "$ROOT_DIR/scripts/desktop-install.sh" --system
  else
    bash "$ROOT_DIR/scripts/desktop-install.sh"
  fi
fi

if [[ "$INSTALL_POLKIT" == "yes" ]]; then
  if ! command -v pkexec >/dev/null 2>&1; then
    echo "pkexec not found. Install polkit first, then rerun this installer." >&2
    exit 1
  fi

  echo "Installing helper -> /usr/lib/wifiary/wifiary-helper"
  sudo install -Dm755 "$HELPER_SRC" /usr/lib/wifiary/wifiary-helper

  echo "Installing PolicyKit action -> /usr/share/polkit-1/actions/org.wifiary.helper.policy"
  sudo install -Dm644 "$ROOT_DIR/packaging/polkit/org.wifiary.helper.policy" \
    /usr/share/polkit-1/actions/org.wifiary.helper.policy

  if [[ "$PASSWORDLESS_WHEEL" == "yes" ]]; then
    echo "Installing passwordless wheel rule -> /etc/polkit-1/rules.d/10-wifiary.rules"
    sudo install -Dm644 "$ROOT_DIR/packaging/polkit/10-wifiary.rules" /etc/polkit-1/rules.d/10-wifiary.rules
  fi
fi

cat <<'EOF'

Done.

Make sure ~/.local/bin is in PATH if you used the default user install.
WiFiary also requires iwd to be installed and running.
EOF

#!/usr/bin/env bash
set -euo pipefail

SCOPE="user"

usage() {
  cat <<'EOF'
WiFiary desktop entry installer

Installs:
  - Desktop entry: wifiary.desktop
  - App icon: wifiary.png (from src-tauri/icons/icon.png)

Usage:
  bash scripts/desktop-install.sh [--system]

Notes:
  - User install goes to:
      ~/.local/share/applications/wifiary.desktop
      ~/.local/share/icons/hicolor/256x256/apps/wifiary.png
  - System install goes to:
      /usr/local/share/applications/wifiary.desktop
      /usr/local/share/icons/hicolor/256x256/apps/wifiary.png
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --system)
      SCOPE="system"
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
DESKTOP_SRC="$ROOT_DIR/packaging/desktop/wifiary.desktop"
ICON_SRC="$ROOT_DIR/src-tauri/icons/icon.png"

if [[ ! -f "$DESKTOP_SRC" ]]; then
  echo "Missing desktop file: $DESKTOP_SRC" >&2
  exit 1
fi
if [[ ! -f "$ICON_SRC" ]]; then
  echo "Missing icon file: $ICON_SRC" >&2
  exit 1
fi

if [[ "$SCOPE" == "system" ]]; then
  echo "Installing system-wide desktop entry + icon..."
  sudo install -Dm644 "$DESKTOP_SRC" /usr/local/share/applications/wifiary.desktop
  sudo install -Dm644 "$ICON_SRC" /usr/local/share/icons/hicolor/256x256/apps/wifiary.png
  echo "Tip: run 'sudo update-desktop-database' if your environment requires it."
else
  echo "Installing user desktop entry + icon..."
  install -Dm644 "$DESKTOP_SRC" "$HOME/.local/share/applications/wifiary.desktop"
  install -Dm644 "$ICON_SRC" "$HOME/.local/share/icons/hicolor/256x256/apps/wifiary.png"
fi

echo "Done."


#!/usr/bin/env bash
set -euo pipefail

MODE="debug"
PASSWORDLESS_WHEEL="no"

usage() {
  cat <<'EOF'
WiFiary Polkit installer

Usage:
  bash scripts/polkit-install.sh [--release] [--passwordless-wheel]

What it does:
  - Builds the privileged helper (wifiary-helper)
  - Installs it to /usr/lib/wifiary/wifiary-helper
  - Installs the PolicyKit action file to /usr/share/polkit-1/actions/org.wifiary.helper.policy
  - Optionally installs a rule that allows wheel users without a password prompt

Notes:
  - Requires sudo privileges.
  - You need a PolicyKit authentication agent running in your desktop session.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      MODE="release"
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

if ! command -v pkexec >/dev/null 2>&1; then
  echo "pkexec not found. Install polkit (e.g. sudo pacman -S polkit)." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo not found. Install Rust toolchain first." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building wifiary-helper ($MODE)…"
pushd "$ROOT_DIR/src-tauri" >/dev/null
if [[ "$MODE" == "release" ]]; then
  cargo build --bin wifiary-helper --release
  HELPER_PATH="$ROOT_DIR/src-tauri/target/release/wifiary-helper"
else
  cargo build --bin wifiary-helper
  HELPER_PATH="$ROOT_DIR/src-tauri/target/debug/wifiary-helper"
fi
popd >/dev/null

if [[ ! -f "$HELPER_PATH" ]]; then
  echo "Helper binary not found at: $HELPER_PATH" >&2
  exit 1
fi

echo "Installing helper -> /usr/lib/wifiary/wifiary-helper"
sudo install -Dm755 "$HELPER_PATH" /usr/lib/wifiary/wifiary-helper

echo "Installing PolicyKit action -> /usr/share/polkit-1/actions/org.wifiary.helper.policy"
sudo install -Dm644 "$ROOT_DIR/packaging/polkit/org.wifiary.helper.policy" \
  /usr/share/polkit-1/actions/org.wifiary.helper.policy

if [[ "$PASSWORDLESS_WHEEL" == "yes" ]]; then
  echo "Installing passwordless wheel rule -> /etc/polkit-1/rules.d/10-wifiary.rules"
  sudo install -Dm644 "$ROOT_DIR/packaging/polkit/10-wifiary.rules" /etc/polkit-1/rules.d/10-wifiary.rules
else
  echo "Not installing passwordless rule (recommended default)."
fi

cat <<'EOF'

Done.

If you run into authentication issues, ensure a Polkit agent is running in your session.
Example packages on Arch:
  - polkit-gnome
  - lxqt-policykit
  - mate-polkit
EOF


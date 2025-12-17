#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Removing /usr/lib/wifiary/wifiary-helper"
sudo rm -f /usr/lib/wifiary/wifiary-helper

echo "Removing /usr/share/polkit-1/actions/org.wifiary.helper.policy"
sudo rm -f /usr/share/polkit-1/actions/org.wifiary.helper.policy

echo "Removing /etc/polkit-1/rules.d/10-wifiary.rules (if present)"
sudo rm -f /etc/polkit-1/rules.d/10-wifiary.rules

echo "Done."


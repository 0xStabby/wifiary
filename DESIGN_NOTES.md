# WiFiary – Design notes

## Privilege strategy

WiFiary uses a **two-process model**:

1. The Tauri backend runs as the user and exposes a small, typed command API to the frontend.
2. Privileged Wi‑Fi operations run in a separate helper binary (`wifiary-helper`) executed via `pkexec` and guarded by PolicyKit.

This keeps the **frontend unprivileged** and avoids granting the main GUI blanket root access.

### Why helper + pkexec (Option B)

Integrating directly with iwd D‑Bus + Polkit actions (Option A) is possible, but it requires reliably targeting iwd’s action IDs and behavior across versions/desktops. The helper approach is:

- easy to audit (one binary, strict allowlist),
- easy to package (one `.policy` file + optional `.rules`),
- robust for non-technical users (standard desktop auth prompts).

## Allowlist and input validation

`wifiary-helper` only implements these subcommands:

- `devices`
- `scan --device <dev>`
- `status --device <dev>`
- `connect --device <dev> --ssid <ssid> [--passphrase <pass>]`
- `disconnect --device <dev>`
- `forget --ssid <ssid>`
- `saved`

All parameters are validated:

- Device name: `^[a-zA-Z0-9._:-]{1,32}$`
- SSID: non-empty, <= 32 chars, no control characters
- Passphrase: 8–63 chars, no control characters

No arbitrary command execution or shell interpolation is used; commands are executed via `std::process::Command`.

## Parsing strategy

`iwctl` table output can vary slightly between versions. WiFiary uses a conservative parser for table output:

- splits columns using **2+ spaces** as a delimiter (instead of exact column indices),
- ignores headers/separators,
- treats unknown/failed lines as “not parseable” and drops them (instead of guessing wrong fields).

If you want even more robustness, a follow-up improvement is to use iwd’s D‑Bus API directly.

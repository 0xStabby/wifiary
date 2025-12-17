import { useEffect, useMemo, useState } from "react";
import styles from "./NetworksScreen.module.css";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { useWifiStore } from "../state/wifiStore";
import type { WifiNetwork } from "../state/types";
import { useToasts } from "../toast/ToastProvider";

function formatSignal(signal: number | null) {
  if (signal === null) return "—";
  const clamped = Math.max(0, Math.min(100, Math.round(signal)));
  return `${clamped}%`;
}

function securityLabel(security: WifiNetwork["security"]) {
  if (security === "open") return "Open";
  if (security === "psk") return "Password";
  if (security === "8021x") return "Enterprise";
  return "Unknown";
}

function sortNetworks(a: WifiNetwork, b: WifiNetwork) {
  if (a.connected !== b.connected) return a.connected ? -1 : 1;
  if (a.known !== b.known) return a.known ? -1 : 1;
  const sa = a.signal ?? -1;
  const sb = b.signal ?? -1;
  if (sa !== sb) return sb - sa;
  return a.ssid.localeCompare(b.ssid);
}

export function NetworksScreen() {
  const { push } = useToasts();
  const {
    config,
    status,
    networks,
    saved,
    scanning,
    busy,
    refreshNetworks,
    refreshSaved,
    connect,
    disconnect,
    forget
  } = useWifiStore();

  const [selected, setSelected] = useState<WifiNetwork | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!config.ui.autoScanOnOpen) return;
    refreshNetworks().catch(() => {});
    refreshSaved().catch(() => {});
  }, [config.ui.autoScanOnOpen, refreshNetworks, refreshSaved]);

  const sorted = useMemo(() => [...networks].sort(sortNetworks), [networks]);

  const canConnect =
    !!selected &&
    (selected.security === "open" || passphrase.length > 0 || selected.known);
  const isConnected = status.state === "connected" && status.connectedSsid;

  async function onConnect() {
    if (!selected) return;
    try {
      const p =
        selected.security === "open" ? undefined : passphrase.trim() === "" ? undefined : passphrase;
      await connect(selected.ssid, p);
      push({ level: "success", title: "Connected", message: selected.ssid });
      setSelected(null);
      setPassphrase("");
    } catch (e) {
      push({
        level: "error",
        title: "Failed to connect",
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  async function onDisconnect() {
    try {
      await disconnect();
      push({ level: "info", title: "Disconnected" });
    } catch (e) {
      push({
        level: "error",
        title: "Failed to disconnect",
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  async function onForget(ssid: string) {
    try {
      await forget(ssid);
      push({ level: "success", title: "Forgot network", message: ssid });
    } catch (e) {
      push({
        level: "error",
        title: "Failed to forget network",
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.statusBar}>
          <div className={styles.statusLeft}>
            <div className={styles.statusTitle}>
              {status.state === "connected" ? "Connected" : "Disconnected"}
            </div>
            <div className={styles.statusSubtitle}>
              {status.device ? (
                <>
                  Device: <span className={styles.mono}>{status.device}</span>
                </>
              ) : (
                "No wireless device detected"
              )}
              {status.connectedSsid ? (
                <>
                  {" "}
                  · SSID: <span className={styles.mono}>{status.connectedSsid}</span>
                </>
              ) : null}
              {status.ipV4 ? (
                <>
                  {" "}
                  · IP: <span className={styles.mono}>{status.ipV4}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className={styles.statusRight}>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await refreshNetworks();
                } catch (e) {
                  push({
                    level: "error",
                    title: "Scan failed",
                    message: e instanceof Error ? e.message : String(e)
                  });
                }
              }}
              disabled={scanning || busy}
            >
              {scanning ? "Scanning…" : "Scan"}
            </Button>
            <Button
              variant="danger"
              onClick={onDisconnect}
              disabled={!isConnected || busy}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Card>

      <div className={styles.sectionTitle}>Available networks</div>

      <Card>
        <div className={styles.list} role="list">
          {sorted.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No networks found</div>
              <div className={styles.emptySubtitle}>
                Click <span className={styles.mono}>Scan</span> to search for Wi‑Fi networks.
              </div>
            </div>
          ) : (
            sorted.map((n) => (
              <button
                key={n.ssid}
                className={styles.row}
                onClick={() => {
                  setSelected(n);
                  setPassphrase("");
                  setShowPassword(false);
                }}
                role="listitem"
              >
                <div className={styles.rowLeft}>
                  <div className={styles.ssid}>
                    {n.connected ? <span className={styles.badge}>Connected</span> : null}
                    {n.known && !n.connected ? <span className={styles.badgeAlt}>Saved</span> : null}
                    <span className={styles.ssidText}>{n.ssid || "(Hidden network)"}</span>
                  </div>
                  <div className={styles.meta}>
                    {securityLabel(n.security)} · Signal {formatSignal(n.signal)}
                  </div>
                </div>
                <div className={styles.rowRight}>Connect</div>
              </button>
            ))
          )}
        </div>
      </Card>

      <div className={styles.sectionTitle}>Saved networks</div>

      <Card>
        <div className={styles.list} role="list">
          {saved.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No saved networks</div>
              <div className={styles.emptySubtitle}>
                Saved networks appear here after you connect.
              </div>
            </div>
          ) : (
            saved.map((s) => (
              <div key={s.ssid} className={styles.savedRow} role="listitem">
                <div className={styles.rowLeft}>
                  <div className={styles.ssid}>
                    <span className={styles.ssidText}>{s.ssid}</span>
                  </div>
                  <div className={styles.meta}>
                    {securityLabel(s.security)}{" "}
                    {s.lastConnected ? (
                      <>
                        · Last: <span className={styles.mono}>{s.lastConnected}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className={styles.savedActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      const match = networks.find((n) => n.ssid === s.ssid);
                      setSelected(
                        match ?? {
                          ssid: s.ssid,
                          security: s.security,
                          signal: null,
                          known: true,
                          connected: status.connectedSsid === s.ssid
                        }
                      );
                      setPassphrase("");
                      setShowPassword(false);
                    }}
                  >
                    Connect
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => onForget(s.ssid)}
                  >
                    Forget
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        title={selected ? `Connect to “${selected.ssid}”` : "Connect"}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className={styles.modalBody}>
            <div className={styles.modalRow}>
              <div className={styles.label}>Security</div>
              <div className={styles.value}>{securityLabel(selected.security)}</div>
            </div>

            {selected.security === "open" ? (
              <div className={styles.helperText}>This network does not require a password.</div>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="wifi-pass">
                    Password
                  </label>
                  <Input
                    id="wifi-pass"
                    autoFocus
                    type={showPassword ? "text" : "password"}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={
                      selected.known
                        ? "Leave blank to use saved password"
                        : "Enter Wi‑Fi password"
                    }
                  />
                </div>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show password
                </label>
                {selected.known ? (
                  <div className={styles.helperText}>
                    This network is saved. You can connect without entering a password.
                  </div>
                ) : null}
              </>
            )}

            <div className={styles.modalActions}>
              {selected.known ? (
                <Button
                  variant="danger"
                  onClick={() => onForget(selected.ssid)}
                  disabled={busy}
                >
                  Forget
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={onConnect} disabled={!canConnect || busy}>
                {busy ? "Connecting…" : "Connect"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

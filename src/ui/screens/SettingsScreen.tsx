import { useEffect, useMemo, useState } from "react";
import styles from "./SettingsScreen.module.css";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useWifiStore } from "../state/wifiStore";
import { builtInThemes } from "../theme/themes";
import { ThemeSchema } from "../theme/themeSchema";
import { useToasts } from "../toast/ToastProvider";

export function SettingsScreen() {
  const { push } = useToasts();
  const { config, status, setConfig, refreshDevices, devices } = useWifiStore();

  const [customJson, setCustomJson] = useState(config.theme.customJson);

  useEffect(() => {
    refreshDevices().catch(() => {});
  }, [refreshDevices]);

  useEffect(() => setCustomJson(config.theme.customJson), [config.theme.customJson]);

  const customError = useMemo(() => {
    if (config.theme.mode !== "custom") return null;
    try {
      ThemeSchema.parse(JSON.parse(customJson || "{}"));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [config.theme.mode, customJson]);

  async function saveCustomTheme() {
    try {
      ThemeSchema.parse(JSON.parse(customJson || "{}"));
    } catch {
      push({ level: "error", title: "Invalid theme JSON", message: customError ?? "" });
      return;
    }
    await setConfig({ theme: { ...config.theme, mode: "custom", customJson } });
    push({ level: "success", title: "Theme updated" });
  }

  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Wi‑Fi device</div>
          <div className={styles.sectionSubtitle}>
            WiFiary auto-detects your wireless device. You can override it if needed.
          </div>
          <div className={styles.row}>
            <select
              className={styles.select}
              value={config.preferredDevice ?? ""}
              onChange={(e) =>
                setConfig({ preferredDevice: e.target.value || null }).catch(() => {})
              }
            >
              <option value="">
                Auto{status.device ? ` (${status.device})` : ""}
              </option>
              {devices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              onClick={() => refreshDevices().catch(() => {})}
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Behavior</div>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={config.ui.autoScanOnOpen}
              onChange={(e) =>
                setConfig({ ui: { ...config.ui, autoScanOnOpen: e.target.checked } }).catch(
                  () => {}
                )
              }
            />
            Auto-scan when opening Wi‑Fi screen
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={config.ui.autoReconnect}
              onChange={(e) =>
                setConfig({ ui: { ...config.ui, autoReconnect: e.target.checked } }).catch(
                  () => {}
                )
              }
            />
            Auto-reconnect to last saved network (uses iwd saved credentials)
          </label>
          <div className={styles.sectionSubtitle}>
            Tip: iwd already handles reconnection in many cases. This toggle controls whether WiFiary
            also attempts reconnecting while it is running.
          </div>
        </div>
      </Card>

      <Card>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Theme</div>
          <div className={styles.rowWrap}>
            <label className={styles.radio}>
              <input
                type="radio"
                name="theme-mode"
                checked={config.theme.mode === "built-in"}
                onChange={() =>
                  setConfig({ theme: { ...config.theme, mode: "built-in" } }).catch(() => {})
                }
              />
              Built‑in
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="theme-mode"
                checked={config.theme.mode === "dark"}
                onChange={() =>
                  setConfig({ theme: { ...config.theme, mode: "dark" } }).catch(() => {})
                }
              />
              Dark
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="theme-mode"
                checked={config.theme.mode === "light"}
                onChange={() =>
                  setConfig({ theme: { ...config.theme, mode: "light" } }).catch(() => {})
                }
              />
              Light
            </label>
            <label className={styles.radio}>
              <input
                type="radio"
                name="theme-mode"
                checked={config.theme.mode === "custom"}
                onChange={() =>
                  setConfig({ theme: { ...config.theme, mode: "custom" } }).catch(() => {})
                }
              />
              Custom JSON
            </label>
          </div>

          {config.theme.mode === "built-in" ? (
            <div className={styles.row}>
              <select
                className={styles.select}
                value={config.theme.builtInName}
                onChange={(e) =>
                  setConfig({
                    theme: { ...config.theme, mode: "built-in", builtInName: e.target.value }
                  }).catch(() => {})
                }
              >
                {builtInThemes.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {config.theme.mode === "custom" ? (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Custom theme JSON</label>
                <textarea
                  className={styles.textarea}
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  spellCheck={false}
                />
                {customError ? (
                  <div className={styles.error}>Invalid JSON: {customError}</div>
                ) : (
                  <div className={styles.hint}>
                    Must match the Theme schema: <span className={styles.mono}>name</span> and{" "}
                    <span className={styles.mono}>colors</span>.
                  </div>
                )}
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" onClick={() => setCustomJson(config.theme.customJson)}>
                  Reset
                </Button>
                <Button onClick={() => saveCustomTheme().catch(() => {})}>Apply</Button>
              </div>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

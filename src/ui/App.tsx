import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import { NetworksScreen } from "./screens/NetworksScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { Button } from "./components/Button";
import { useWifiStore } from "./state/wifiStore";

type Screen = "networks" | "settings";

export function App() {
  const [screen, setScreen] = useState<Screen>("networks");
  const { refreshStatus, refreshConfig, maybeAutoReconnect } = useWifiStore();

  useEffect(() => {
    refreshConfig().catch(() => {});
    refreshStatus().catch(() => {});
    const timer = window.setInterval(() => {
      refreshStatus()
        .then(() => maybeAutoReconnect())
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [maybeAutoReconnect, refreshConfig, refreshStatus]);

  const title = useMemo(() => {
    if (screen === "settings") return "Settings";
    return "Wi‑Fi";
  }, [screen]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.appTitle}>WiFiary</div>
          <div className={styles.pageTitle}>{title}</div>
        </div>
        <div className={styles.headerRight}>
          <Button
            variant={screen === "networks" ? "primary" : "ghost"}
            onClick={() => setScreen("networks")}
          >
            Networks
          </Button>
          <Button
            variant={screen === "settings" ? "primary" : "ghost"}
            onClick={() => setScreen("settings")}
          >
            Settings
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        {screen === "networks" ? <NetworksScreen /> : <SettingsScreen />}
      </main>
    </div>
  );
}

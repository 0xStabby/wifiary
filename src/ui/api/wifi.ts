import type { AppConfig, ConfigPatch, SavedNetwork, WifiNetwork, WifiStatus } from "../state/types";
import { tauriInvoke } from "./tauri";

const MOCK_PARAM = "mock";

function isMockMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(MOCK_PARAM);
}

type MockState = {
  config: AppConfig;
  status: WifiStatus;
  networks: WifiNetwork[];
  saved: SavedNetwork[];
  devices: string[];
};

const mockState: MockState = {
  config: {
    schemaVersion: 1,
    preferredDevice: null,
    ui: {
      autoScanOnOpen: true,
      autoReconnect: false
    },
    theme: {
      mode: "built-in",
      builtInName: "Hacker",
      customJson: ""
    }
  },
  status: {
    device: "wlan0",
    state: "connected",
    connectedSsid: "Neon-Lab",
    ipV4: "192.168.1.42"
  },
  devices: ["wlan0", "wlp3s0", "wlan1"],
  networks: [
    { ssid: "Neon-Lab", security: "psk", signal: 92, known: true, connected: true },
    { ssid: "GhostNet", security: "psk", signal: 77, known: true, connected: false },
    { ssid: "Open Atrium", security: "open", signal: 64, known: false, connected: false },
    { ssid: "Blackbox", security: "8021x", signal: 58, known: false, connected: false },
    { ssid: "MESH-04", security: "psk", signal: 41, known: true, connected: false },
    { ssid: "Cafe_Relay", security: "psk", signal: 33, known: false, connected: false },
    { ssid: "", security: "psk", signal: 25, known: false, connected: false }
  ],
  saved: [
    { ssid: "Neon-Lab", security: "psk", lastConnected: "2025-03-04 18:22" },
    { ssid: "GhostNet", security: "psk", lastConnected: "2025-02-27 08:10" },
    { ssid: "MESH-04", security: "psk", lastConnected: null }
  ]
};

function ensureSaved(ssid: string, security: WifiNetwork["security"]) {
  if (mockState.saved.some((s) => s.ssid === ssid)) return;
  mockState.saved.unshift({ ssid, security, lastConnected: "2025-03-04 18:22" });
}

function updateNetworkFlags(ssid: string, connected: boolean) {
  mockState.networks = mockState.networks.map((n) => {
    if (n.ssid === ssid) {
      return { ...n, connected, known: true };
    }
    return { ...n, connected: false };
  });
}

export const wifiApi = {
  scan: () =>
    isMockMode()
      ? Promise.resolve([...mockState.networks])
      : tauriInvoke<WifiNetwork[]>("wifi_scan"),
  status: () =>
    isMockMode()
      ? Promise.resolve({ ...mockState.status })
      : tauriInvoke<WifiStatus>("wifi_status"),
  connect: (ssid: string, passphrase?: string) =>
    isMockMode()
      ? Promise.resolve().then(() => {
          mockState.status = {
            ...mockState.status,
            state: "connected",
            connectedSsid: ssid,
            ipV4: "192.168.1.42"
          };
          const match = mockState.networks.find((n) => n.ssid === ssid);
          updateNetworkFlags(ssid, true);
          ensureSaved(ssid, match?.security ?? "psk");
        })
      : tauriInvoke<void>("wifi_connect", { ssid, passphrase }),
  disconnect: () =>
    isMockMode()
      ? Promise.resolve().then(() => {
          mockState.status = {
            ...mockState.status,
            state: "disconnected",
            connectedSsid: null,
            ipV4: null
          };
          mockState.networks = mockState.networks.map((n) => ({ ...n, connected: false }));
        })
      : tauriInvoke<void>("wifi_disconnect"),
  forget: (ssid: string) =>
    isMockMode()
      ? Promise.resolve().then(() => {
          mockState.saved = mockState.saved.filter((s) => s.ssid !== ssid);
          mockState.networks = mockState.networks.map((n) =>
            n.ssid === ssid ? { ...n, known: false, connected: false } : n
          );
        })
      : tauriInvoke<void>("wifi_forget", { ssid }),
  saved: () =>
    isMockMode()
      ? Promise.resolve([...mockState.saved])
      : tauriInvoke<SavedNetwork[]>("wifi_saved_networks"),
  devices: () =>
    isMockMode()
      ? Promise.resolve([...mockState.devices])
      : tauriInvoke<string[]>("wifi_devices"),
  configGet: () =>
    isMockMode()
      ? Promise.resolve({ ...mockState.config })
      : tauriInvoke<AppConfig>("config_get"),
  configSet: (patch: ConfigPatch) =>
    isMockMode()
      ? Promise.resolve().then(() => {
          mockState.config = {
            ...mockState.config,
            ...patch,
            ui: patch.ui ? { ...mockState.config.ui, ...patch.ui } : mockState.config.ui,
            theme: patch.theme ? { ...mockState.config.theme, ...patch.theme } : mockState.config.theme
          };
          return { ...mockState.config };
        })
      : tauriInvoke<AppConfig>("config_set", { patch })
};

import type { AppConfig, ConfigPatch, SavedNetwork, WifiNetwork, WifiStatus } from "../state/types";
import { tauriInvoke } from "./tauri";

export const wifiApi = {
  scan: () => tauriInvoke<WifiNetwork[]>("wifi_scan"),
  status: () => tauriInvoke<WifiStatus>("wifi_status"),
  connect: (ssid: string, passphrase?: string) =>
    tauriInvoke<void>("wifi_connect", { ssid, passphrase }),
  disconnect: () => tauriInvoke<void>("wifi_disconnect"),
  forget: (ssid: string) => tauriInvoke<void>("wifi_forget", { ssid }),
  saved: () => tauriInvoke<SavedNetwork[]>("wifi_saved_networks"),
  devices: () => tauriInvoke<string[]>("wifi_devices"),
  configGet: () => tauriInvoke<AppConfig>("config_get"),
  configSet: (patch: ConfigPatch) => tauriInvoke<AppConfig>("config_set", { patch })
};

export type WifiSecurity = "open" | "psk" | "8021x" | "unknown";

export type WifiNetwork = {
  ssid: string;
  security: WifiSecurity;
  signal: number | null;
  known: boolean;
  connected: boolean;
};

export type WifiStatus = {
  device: string | null;
  state: "connected" | "disconnected" | "connecting" | "unknown";
  connectedSsid: string | null;
  ipV4: string | null;
};

export type SavedNetwork = {
  ssid: string;
  security: WifiSecurity;
  lastConnected: string | null;
};

export type AppConfig = {
  schemaVersion: number;
  preferredDevice: string | null;
  ui: {
    autoScanOnOpen: boolean;
    autoReconnect: boolean;
  };
  theme: {
    mode: "built-in" | "light" | "dark" | "custom";
    builtInName: string;
    customJson: string;
  };
};

export type ConfigPatch = {
  preferredDevice?: string | null;
  ui?: AppConfig["ui"];
  theme?: AppConfig["theme"];
};

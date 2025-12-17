import { create } from "zustand";
import type { AppConfig, ConfigPatch, SavedNetwork, WifiNetwork, WifiStatus } from "./types";
import { wifiApi } from "../api/wifi";

const defaultConfig: AppConfig = {
  schemaVersion: 1,
  preferredDevice: null,
  ui: {
    autoScanOnOpen: true,
    autoReconnect: false
  },
  theme: {
    mode: "built-in",
    builtInName: "Catppuccin Mocha",
    customJson: ""
  }
};

type WifiState = {
  config: AppConfig;
  status: WifiStatus;
  networks: WifiNetwork[];
  saved: SavedNetwork[];
  devices: string[];
  scanning: boolean;
  busy: boolean;
  autoReconnectHoldUntilMs: number;
  lastAutoReconnectAttemptMs: number;

  refreshConfig: () => Promise<void>;
  setConfig: (patch: ConfigPatch) => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshNetworks: () => Promise<void>;
  refreshSaved: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  maybeAutoReconnect: () => Promise<void>;

  connect: (ssid: string, passphrase?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  forget: (ssid: string) => Promise<void>;
};

const defaultStatus: WifiStatus = {
  device: null,
  state: "unknown",
  connectedSsid: null,
  ipV4: null
};

export const useWifiStore = create<WifiState>((set, get) => ({
  config: defaultConfig,
  status: defaultStatus,
  networks: [],
  saved: [],
  devices: [],
  scanning: false,
  busy: false,
  autoReconnectHoldUntilMs: 0,
  lastAutoReconnectAttemptMs: 0,

  refreshConfig: async () => {
    const cfg = await wifiApi.configGet();
    set({ config: cfg });
  },

  setConfig: async (patch) => {
    const cfg = await wifiApi.configSet(patch);
    set({ config: cfg });
  },

  refreshStatus: async () => {
    const status = await wifiApi.status();
    set({ status });
  },

  refreshNetworks: async () => {
    if (get().scanning) return;
    set({ scanning: true });
    try {
      const networks = await wifiApi.scan();
      set({ networks });
    } finally {
      set({ scanning: false });
    }
  },

  refreshSaved: async () => {
    const saved = await wifiApi.saved();
    set({ saved });
  },

  refreshDevices: async () => {
    const devices = await wifiApi.devices();
    set({ devices });
  },

  maybeAutoReconnect: async () => {
    const { config, status, busy, autoReconnectHoldUntilMs, lastAutoReconnectAttemptMs } = get();
    if (!config.ui.autoReconnect) return;
    if (busy) return;
    if (status.state === "connected" || status.state === "connecting") return;
    const now = Date.now();
    if (now < autoReconnectHoldUntilMs) return;
    if (now - lastAutoReconnectAttemptMs < 30_000) return;

    if (get().saved.length === 0) {
      await get().refreshSaved();
    }
    const candidate = get().saved[0];
    if (!candidate) return;

    set({ lastAutoReconnectAttemptMs: now });
    await get().connect(candidate.ssid);
  },

  connect: async (ssid, passphrase) => {
    set({ busy: true });
    try {
      await wifiApi.connect(ssid, passphrase);
      await Promise.allSettled([get().refreshStatus(), get().refreshNetworks(), get().refreshSaved()]);
    } finally {
      set({ busy: false });
    }
  },

  disconnect: async () => {
    set({ busy: true });
    try {
      await wifiApi.disconnect();
      set({ autoReconnectHoldUntilMs: Date.now() + 60_000 });
      await Promise.allSettled([get().refreshStatus(), get().refreshNetworks()]);
    } finally {
      set({ busy: false });
    }
  },

  forget: async (ssid) => {
    set({ busy: true });
    try {
      await wifiApi.forget(ssid);
      await Promise.allSettled([get().refreshSaved(), get().refreshNetworks()]);
    } finally {
      set({ busy: false });
    }
  }
}));

import type { Theme } from "./themeSchema";

export const builtInThemes: Theme[] = [
  {
    name: "Catppuccin Mocha",
    colors: {
      bg: "#11111b",
      panel: "#181825",
      panel2: "#1e1e2e",
      fg: "#cdd6f4",
      muted: "#a6adc8",
      border: "rgba(205, 214, 244, 0.10)",
      primary: "#89b4fa",
      primaryFg: "#0b1020",
      danger: "#f38ba8",
      warning: "#fab387",
      success: "#a6e3a1"
    }
  },
  {
    name: "Catppuccin Latte",
    colors: {
      bg: "#eff1f5",
      panel: "#ffffff",
      panel2: "#f7f7fb",
      fg: "#4c4f69",
      muted: "#6c6f85",
      border: "rgba(76, 79, 105, 0.10)",
      primary: "#1e66f5",
      primaryFg: "#ffffff",
      danger: "#d20f39",
      warning: "#df8e1d",
      success: "#40a02b"
    }
  },
  {
    name: "Midnight",
    colors: {
      bg: "#0f1115",
      panel: "#141823",
      panel2: "#171c29",
      fg: "#e6eaf2",
      muted: "#a6b0c2",
      border: "rgba(255, 255, 255, 0.09)",
      primary: "#7aa2f7",
      primaryFg: "#0b1020",
      danger: "#f7768e",
      warning: "#e0af68",
      success: "#9ece6a"
    }
  },
  {
    name: "Hacker",
    colors: {
      bg: "#000000",
      panel: "#050a07",
      panel2: "#0a140f",
      fg: "#a8ffbf",
      muted: "#6fa987",
      border: "#0e1d15",
      primary: "#00ff90",
      primaryFg: "#00140a",
      danger: "#ef4444",
      warning: "#f59e0b",
      success: "#00ff90"
    }
  },
  {
    name: "Dark",
    colors: {
      bg: "#000000",
      panel: "#0f0f0f",
      panel2: "#141414",
      fg: "#cce3d6",
      muted: "#9aa0a6",
      border: "#2a2a2a",
      primary: "#6c9f4b",
      primaryFg: "#081209",
      danger: "#ef4444",
      warning: "#f59e0b",
      success: "#00b746"
    }
  },
  {
    name: "Light",
    colors: {
      bg: "#eef1f5",
      panel: "#f9fafb",
      panel2: "#f3f4f6",
      fg: "#111827",
      muted: "#6b7280",
      border: "#cbd5e1",
      primary: "#2563eb",
      primaryFg: "#ffffff",
      danger: "#dc2626",
      warning: "#d97706",
      success: "#16a34a"
    }
  },
  {
    name: "Ocean",
    colors: {
      bg: "#0a0f1f",
      panel: "#0f172a",
      panel2: "#1e293b",
      fg: "#dbeafe",
      muted: "#93a4c2",
      border: "#1f2a44",
      primary: "#3b82f6",
      primaryFg: "#ffffff",
      danger: "#ef4444",
      warning: "#f59e0b",
      success: "#22c55e"
    }
  },
  {
    name: "Dim",
    colors: {
      bg: "#d1d5db",
      panel: "#e5e7eb",
      panel2: "#f3f4f6",
      fg: "#0f172a",
      muted: "#475569",
      border: "#94a3b8",
      primary: "#334155",
      primaryFg: "#ffffff",
      danger: "#b91c1c",
      warning: "#b45309",
      success: "#15803d"
    }
  },
  {
    name: "AMOLED",
    colors: {
      bg: "#000000",
      panel: "#0a0a0a",
      panel2: "#151515",
      fg: "#e6e6e6",
      muted: "#9aa0a6",
      border: "#1f1f1f",
      primary: "#00d9ff",
      primaryFg: "#001018",
      danger: "#ff3b3b",
      warning: "#f59e0b",
      success: "#16c784"
    }
  },
  {
    name: "Dracula",
    colors: {
      bg: "#242633",
      panel: "#2a2e3f",
      panel2: "#343851",
      fg: "#f8f8f2",
      muted: "#a6adc8",
      border: "#3b3f54",
      primary: "#bd93f9",
      primaryFg: "#1b1024",
      danger: "#ff5555",
      warning: "#f1fa8c",
      success: "#50fa7b"
    }
  },
  {
    name: "Nord",
    colors: {
      bg: "#2e3440",
      panel: "#3b4252",
      panel2: "#434c5e",
      fg: "#e5e9f0",
      muted: "#d8dee9",
      border: "#434c5e",
      primary: "#88c0d0",
      primaryFg: "#0b1020",
      danger: "#bf616a",
      warning: "#ebcb8b",
      success: "#a3be8c"
    }
  },
  {
    name: "Gruvbox",
    colors: {
      bg: "#282828",
      panel: "#3c3836",
      panel2: "#4a3f36",
      fg: "#ebdbb2",
      muted: "#d5c4a1",
      border: "#504945",
      primary: "#fabd2f",
      primaryFg: "#1a1200",
      danger: "#fb4934",
      warning: "#fe8019",
      success: "#b8bb26"
    }
  },
  {
    name: "Solarized Dark",
    colors: {
      bg: "#002b36",
      panel: "#073642",
      panel2: "#0d3b4b",
      fg: "#eee8d5",
      muted: "#93a1a1",
      border: "#0d3b4b",
      primary: "#268bd2",
      primaryFg: "#ffffff",
      danger: "#dc322f",
      warning: "#b58900",
      success: "#859900"
    }
  },
  {
    name: "Forest",
    colors: {
      bg: "#0e1411",
      panel: "#162017",
      panel2: "#1e2a22",
      fg: "#dbe7df",
      muted: "#a7bdb0",
      border: "#233327",
      primary: "#4caf50",
      primaryFg: "#07170c",
      danger: "#e53935",
      warning: "#f59e0b",
      success: "#43a047"
    }
  },
  {
    name: "Sunset",
    colors: {
      bg: "#1f1a24",
      panel: "#2a1e2e",
      panel2: "#3b2a3d",
      fg: "#ffe4d6",
      muted: "#f2b8a9",
      border: "#3b2a3d",
      primary: "#ff7a59",
      primaryFg: "#2a0900",
      danger: "#ef4444",
      warning: "#fb923c",
      success: "#f59e0b"
    }
  },
  {
    name: "Cyberpunk",
    colors: {
      bg: "#0a0a12",
      panel: "#131324",
      panel2: "#22224a",
      fg: "#eae9ff",
      muted: "#bcb9ff",
      border: "#22224a",
      primary: "#ff38a1",
      primaryFg: "#2a0016",
      danger: "#ff3b81",
      warning: "#ffd166",
      success: "#00ffa3"
    }
  },
  {
    name: "Sepia",
    colors: {
      bg: "#f1e9d2",
      panel: "#fbf6ea",
      panel2: "#f3eddc",
      fg: "#3b342b",
      muted: "#6b5e4f",
      border: "#e2d3b2",
      primary: "#8a5a44",
      primaryFg: "#fffaf4",
      danger: "#a23b2a",
      warning: "#b08928",
      success: "#5a8a44"
    }
  },
  {
    name: "High Contrast",
    colors: {
      bg: "#000000",
      panel: "#1a1a1a",
      panel2: "#2a2a2a",
      fg: "#ffffff",
      muted: "#d1d5db",
      border: "#6b7280",
      primary: "#00ffff",
      primaryFg: "#001010",
      danger: "#ff3131",
      warning: "#ffd400",
      success: "#00ff88"
    }
  },
  {
    name: "Oasis",
    colors: {
      bg: "#0f1116",
      panel: "#1b1712",
      panel2: "#2a221a",
      fg: "#fff4e6",
      muted: "#d7c1a3",
      border: "#3a2e22",
      primary: "#ff7a45",
      primaryFg: "#1a0700",
      danger: "#ff4d2e",
      warning: "#ffb84a",
      success: "#4ccfa3"
    }
  },
  {
    name: "Minecraft",
    colors: {
      bg: "#12110e",
      panel: "#1e1b14",
      panel2: "#2b2f28",
      fg: "#e6f5e1",
      muted: "#a3b49a",
      border: "#3a4334",
      primary: "#3ba740",
      primaryFg: "#06150a",
      danger: "#b5442e",
      warning: "#c8892b",
      success: "#5ac25a"
    }
  },
  {
    name: "RuneScape",
    colors: {
      bg: "#141310",
      panel: "#1d1a15",
      panel2: "#2e281d",
      fg: "#e5e0c6",
      muted: "#b6ad8a",
      border: "#2c251b",
      primary: "#bdae58",
      primaryFg: "#1a1405",
      danger: "#b83a2b",
      warning: "#d08c2f",
      success: "#3faf5f"
    }
  },
  {
    name: "RuneScape Stone",
    colors: {
      bg: "#161513",
      panel: "#24211b",
      panel2: "#3a3326",
      fg: "#efe8c6",
      muted: "#c3b78f",
      border: "#3a3225",
      primary: "#bdae58",
      primaryFg: "#1a1405",
      danger: "#b83a2b",
      warning: "#d08c2f",
      success: "#3faf5f"
    }
  },
  {
    name: "RuneScape Gold",
    colors: {
      bg: "#141310",
      panel: "#1b160f",
      panel2: "#3b3015",
      fg: "#f7e9b1",
      muted: "#d4c58c",
      border: "#3a2f17",
      primary: "#f0c419",
      primaryFg: "#1a1100",
      danger: "#d94a3a",
      warning: "#ffb02e",
      success: "#4ac26d"
    }
  }
];

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
  }
];


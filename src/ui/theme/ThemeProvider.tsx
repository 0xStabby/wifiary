import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { ThemeSchema, type Theme } from "./themeSchema";
import { builtInThemes } from "./themes";
import { useWifiStore } from "../state/wifiStore";

type ThemeMode = "light" | "dark" | "custom" | "built-in";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: Theme;
  setBuiltInThemeName: (name: string) => void;
  setCustomThemeJson: (json: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function pickColorScheme(bg: string, fallback: "dark" | "light") {
  const hex = bg.trim().toLowerCase();
  const m6 = /^#([0-9a-f]{6})$/.exec(hex);
  const m3 = /^#([0-9a-f]{3})$/.exec(hex);
  const raw = m6?.[1] ?? (m3 ? m3[1].split("").map((c) => c + c).join("") : null);
  if (!raw) return fallback;

  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const c = theme.colors;
  root.style.setProperty("--bg", c.bg);
  root.style.setProperty("--panel", c.panel);
  root.style.setProperty("--panel2", c.panel2);
  root.style.setProperty("--fg", c.fg);
  root.style.setProperty("--muted", c.muted);
  root.style.setProperty("--border", c.border);
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--primaryFg", c.primaryFg);
  root.style.setProperty("--danger", c.danger);
  root.style.setProperty("--warning", c.warning);
  root.style.setProperty("--success", c.success);
  root.style.setProperty("--focus", `color-mix(in srgb, ${c.primary} 40%, transparent)`);

  // Extended tokens (used by some theme packs + future styling)
  root.style.setProperty("--background", c.bg);
  root.style.setProperty("--surface", c.panel);
  root.style.setProperty("--text", c.fg);
  root.style.setProperty("--info", c.primary);
  root.style.setProperty("--modal-bg", c.panel);
  root.style.setProperty("--overlay", "rgb(0 0 0 / 55%)");
  root.style.setProperty("--shadow-1", "0 4px 10px rgb(0 0 0 / 30%)");
  root.style.setProperty("--button-bg", `linear-gradient(${c.panel2}, ${c.bg})`);
  root.style.setProperty("--button-bg-hover", c.panel2);
  root.style.setProperty("--default-btn-background", `linear-gradient(${c.panel2}, ${c.bg})`);
  root.style.setProperty("--default-btn-background-hover", c.panel2);

  const scheme = pickColorScheme(c.bg, "dark");
  root.dataset.colorScheme = scheme;
}

function pickDefaultTheme(prefersDark: boolean) {
  const dark = builtInThemes.find((t) => t.name === "Dark");
  const light = builtInThemes.find((t) => t.name === "Light");
  if (dark && light) return prefersDark ? dark : light;

  const mocha = builtInThemes.find((t) => t.name.includes("Mocha"));
  const latte = builtInThemes.find((t) => t.name.includes("Latte"));
  return prefersDark ? dark ?? mocha ?? builtInThemes[0] : light ?? latte ?? builtInThemes[0];
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { config, setConfig } = useWifiStore();
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;

  const [runtimeTheme, setRuntimeTheme] = useState<Theme>(() =>
    pickDefaultTheme(prefersDark)
  );
  const [mode, setMode] = useState<ThemeMode>("built-in");

  useEffect(() => {
    const builtIn = builtInThemes.find((t) => t.name === config.theme.builtInName);
    if (config.theme.mode === "custom") {
      setMode("custom");
      try {
        const raw = JSON.parse(config.theme.customJson || "{}");
        const parsed = ThemeSchema.parse(raw);
        setRuntimeTheme(parsed);
        applyTheme(parsed);
      } catch {
        const fallback = builtIn ?? pickDefaultTheme(prefersDark);
        setRuntimeTheme(fallback);
        applyTheme(fallback);
      }
      return;
    }

    if (config.theme.mode === "light" || config.theme.mode === "dark") {
      const fallback = pickDefaultTheme(config.theme.mode === "dark");
      setMode(config.theme.mode);
      setRuntimeTheme(fallback);
      applyTheme(fallback);
      return;
    }

    const theme = builtIn ?? pickDefaultTheme(prefersDark);
    setMode("built-in");
    setRuntimeTheme(theme);
    applyTheme(theme);
  }, [config.theme, prefersDark]);

  const setBuiltInThemeName = useCallback(
    (name: string) => {
      setMode("built-in");
      setConfig({ theme: { ...config.theme, mode: "built-in", builtInName: name } }).catch(
        () => {}
      );
    },
    [config.theme, setConfig]
  );

  const setCustomThemeJson = useCallback(
    (json: string) => {
      setMode("custom");
      setConfig({ theme: { ...config.theme, mode: "custom", customJson: json } }).catch(
        () => {}
      );
    },
    [config.theme, setConfig]
  );

  const value = useMemo(
    () => ({
      mode,
      theme: runtimeTheme,
      setBuiltInThemeName,
      setCustomThemeJson
    }),
    [mode, runtimeTheme, setBuiltInThemeName, setCustomThemeJson]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}

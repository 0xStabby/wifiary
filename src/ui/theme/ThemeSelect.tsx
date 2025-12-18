import { useMemo } from "react";
import styles from "./ThemeSelect.module.css";
import { useTheme } from "./ThemeProvider";
import { builtInThemes } from "./themes";
import type { Theme } from "./themeSchema";

type Palette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};

function toPalette(theme: Theme): Palette {
  const c = theme.colors;
  return {
    background: c.bg,
    surface: c.panel,
    text: c.fg,
    muted: c.muted,
    border: c.border,
    primary: c.primary,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    info: c.primary
  };
}

export function ThemeSelect() {
  const { theme, setBuiltInThemeName } = useTheme();

  const palettes = useMemo(
    () =>
      builtInThemes.map((t) => ({
        name: t.name,
        palette: toPalette(t)
      })),
    []
  );

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {palettes.map(({ name, palette }) => {
          const selected = theme.name === name;
          return (
            <button
              key={name}
              type="button"
              className={`${styles.card} ${selected ? styles.selected : ""}`}
              onClick={() => setBuiltInThemeName(name)}
              aria-pressed={selected}
              aria-label={`Apply ${name} theme`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>{name}</div>
                {selected ? <span className={styles.badge}>Active</span> : null}
              </div>
              {renderPreview(palette)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function renderPreview(p: Palette) {
  return (
    <div className={styles.preview} style={{ background: p.background, color: p.text }}>
      <div
        className={styles.previewHeader}
        style={{ background: p.surface, borderBottom: `1px solid ${p.border}` }}
      >
        <div className={styles.previewDot} style={{ background: p.danger }} />
        <div className={styles.previewDot} style={{ background: p.warning }} />
        <div className={styles.previewDot} style={{ background: p.success }} />
      </div>
      <div
        className={styles.previewTabs}
        style={{ background: p.surface, borderBottom: `1px solid ${p.border}` }}
      >
        <div className={styles.previewTab} style={{ color: p.text }}>
          Tab
        </div>
        <div
          className={`${styles.previewTab} ${styles.previewTabSelected}`}
          style={{ color: p.text, borderBottom: `2px solid ${p.primary}` }}
        >
          Active
        </div>
        <div className={styles.previewTab} style={{ color: p.muted }}>
          More
        </div>
      </div>
      <div className={styles.previewBody}>
        <div
          className={styles.previewPanel}
          style={{ background: p.surface, border: `1px solid ${p.border}` }}
        >
          <div className={styles.previewText} style={{ color: p.text }}>
            Aa
          </div>
          <div className={styles.previewMuted} style={{ color: p.muted }}>
            Muted
          </div>
          <div className={styles.previewControls}>
            <div
              className={styles.previewInput}
              style={{ background: p.background, border: `1px solid ${p.border}` }}
            />
            <div
              className={styles.previewButton}
              style={{ background: p.primary, border: `1px solid ${p.border}` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

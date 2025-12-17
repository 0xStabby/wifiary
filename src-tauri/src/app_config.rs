use anyhow::{Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::{Path, PathBuf},
};

const APP_DIR_NAME: &str = "wifiary";
const CONFIG_FILE_NAME: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
  pub schema_version: u32,
  #[serde(default)]
  pub preferred_device: Option<String>,
  #[serde(default)]
  pub ui: UiConfig,
  #[serde(default)]
  pub theme: ThemeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiConfig {
  #[serde(default = "default_true")]
  pub auto_scan_on_open: bool,
  #[serde(default)]
  pub auto_reconnect: bool,
}

impl Default for UiConfig {
  fn default() -> Self {
    Self {
      auto_scan_on_open: true,
      auto_reconnect: false,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeConfig {
  #[serde(default)]
  pub mode: ThemeMode,
  #[serde(default = "default_built_in_name")]
  pub built_in_name: String,
  #[serde(default)]
  pub custom_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemeMode {
  BuiltIn,
  Light,
  Dark,
  Custom,
}

impl Default for ThemeMode {
  fn default() -> Self {
    ThemeMode::BuiltIn
  }
}

impl Default for ThemeConfig {
  fn default() -> Self {
    Self {
      mode: ThemeMode::BuiltIn,
      built_in_name: default_built_in_name(),
      custom_json: "".to_string(),
    }
  }
}

impl Default for AppConfig {
  fn default() -> Self {
    Self {
      schema_version: 1,
      preferred_device: None,
      ui: UiConfig::default(),
      theme: ThemeConfig::default(),
    }
  }
}

fn default_true() -> bool {
  true
}

fn default_built_in_name() -> String {
  "Catppuccin Mocha".to_string()
}

pub fn config_dir() -> Result<PathBuf> {
  if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
    if !xdg.trim().is_empty() {
      return Ok(PathBuf::from(xdg).join(APP_DIR_NAME));
    }
  }
  let home = std::env::var("HOME").context("HOME is not set")?;
  Ok(PathBuf::from(home).join(".config").join(APP_DIR_NAME))
}

pub fn config_path() -> Result<PathBuf> {
  Ok(config_dir()?.join(CONFIG_FILE_NAME))
}

pub fn load() -> Result<AppConfig> {
  let path = config_path()?;
  if !path.exists() {
    return Ok(AppConfig::default());
  }
  let content = fs::read_to_string(&path).with_context(|| format!("read {}", path.display()))?;
  let mut cfg: AppConfig = serde_json::from_str(&content).context("parse config.json")?;
  if cfg.schema_version != AppConfig::default().schema_version {
    cfg.schema_version = AppConfig::default().schema_version;
  }
  let changed = sanitize_config(&mut cfg);
  if changed {
    // Best-effort cleanup: if a previous version stored invalid values (e.g., control codes),
    // rewrite the config so the UI and device selection are stable.
    let _ = save(&cfg);
  }
  Ok(cfg)
}

pub fn save(config: &AppConfig) -> Result<()> {
  let dir = config_dir()?;
  fs::create_dir_all(&dir).with_context(|| format!("create {}", dir.display()))?;
  let path = dir.join(CONFIG_FILE_NAME);
  atomic_write_json(&path, config)
}

fn atomic_write_json(path: &Path, value: &impl Serialize) -> Result<()> {
  let tmp = path.with_extension("json.tmp");
  let json = serde_json::to_string_pretty(value).context("serialize config")?;
  fs::write(&tmp, json.as_bytes()).with_context(|| format!("write {}", tmp.display()))?;
  fs::rename(&tmp, path).with_context(|| format!("rename {} -> {}", tmp.display(), path.display()))?;
  Ok(())
}

fn sanitize_config(cfg: &mut AppConfig) -> bool {
  let mut changed = false;
  let sanitized = sanitize_device_name(cfg.preferred_device.as_deref());
  if sanitized != cfg.preferred_device {
    cfg.preferred_device = sanitized;
    changed = true;
  }
  changed
}

fn sanitize_device_name(device: Option<&str>) -> Option<String> {
  let d = device?.trim();
  if d.is_empty() {
    return None;
  }
  if d.chars().any(|c| c.is_control()) {
    return None;
  }
  let re = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,31}$").expect("regex");
  if !re.is_match(d) {
    return None;
  }
  Some(d.to_string())
}

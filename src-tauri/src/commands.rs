use crate::{app_config, wifi};
use serde::Deserialize;
use std::sync::Mutex;
use tauri::State;
use tracing::instrument;

pub struct AppState(pub Mutex<app_config::AppConfig>);

impl Default for AppState {
  fn default() -> Self {
    Self(Mutex::new(app_config::load().unwrap_or_default()))
  }
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn config_get(
  state: State<'_, AppState>,
) -> std::result::Result<app_config::AppConfig, String> {
  Ok(state.0.lock().expect("config mutex").clone())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigPatch {
  pub preferred_device: Option<Option<String>>,
  pub ui: Option<app_config::UiConfig>,
  pub theme: Option<app_config::ThemeConfig>,
}

#[tauri::command]
#[instrument(skip(state, patch))]
pub async fn config_set(
  state: State<'_, AppState>,
  patch: ConfigPatch,
) -> std::result::Result<app_config::AppConfig, String> {
  let mut cfg = state.0.lock().expect("config mutex");
  if let Some(pd) = patch.preferred_device {
    if let Some(ref value) = pd {
      // Validate early so we don't persist garbage values (e.g. ANSI escape sequences).
      if value.trim().is_empty() || value.chars().any(|c| c.is_control()) {
        return Err("Invalid device name".to_string());
      }
    }
    cfg.preferred_device = pd
      .as_deref()
      .map(|s| s.trim().to_string())
      .filter(|s| !s.is_empty());
  }
  if let Some(ui) = patch.ui {
    cfg.ui = ui;
  }
  if let Some(theme) = patch.theme {
    cfg.theme = theme;
  }
  app_config::save(&cfg).map_err(|e| format!("{e:#}"))?;
  Ok(cfg.clone())
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn wifi_scan(state: State<'_, AppState>) -> Result<Vec<wifi::WifiNetwork>, String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::scan(&cfg).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn wifi_status(state: State<'_, AppState>) -> Result<wifi::WifiStatus, String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::status(&cfg).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(state, passphrase), fields(ssid = %ssid))]
pub async fn wifi_connect(
  state: State<'_, AppState>,
  ssid: String,
  passphrase: Option<String>,
) -> Result<(), String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::connect(&cfg, &ssid, passphrase.as_deref()).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn wifi_disconnect(state: State<'_, AppState>) -> Result<(), String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::disconnect(&cfg).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(state), fields(ssid = %ssid))]
pub async fn wifi_forget(state: State<'_, AppState>, ssid: String) -> Result<(), String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::forget(&cfg, &ssid).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn wifi_saved_networks(
  state: State<'_, AppState>,
) -> Result<Vec<wifi::SavedNetwork>, String> {
  let cfg = state.0.lock().expect("config mutex").clone();
  wifi::saved_networks(&cfg).map_err(|e| format!("{e:#}"))
}

#[tauri::command]
#[instrument(skip(_state))]
pub async fn wifi_devices(_state: State<'_, AppState>) -> Result<Vec<String>, String> {
  wifi::devices().map_err(|e| format!("{e:#}"))
}

type Result<T, E = String> = std::result::Result<T, E>;

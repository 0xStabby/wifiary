mod app_config;
mod commands;
mod wifi;

use tracing_subscriber::EnvFilter;

fn main() {
  tracing_subscriber::fmt()
    .with_env_filter(EnvFilter::from_default_env())
    .with_target(false)
    .compact()
    .init();

  tauri::Builder::default()
    .manage(commands::AppState::default())
    .invoke_handler(tauri::generate_handler![
      commands::wifi_scan,
      commands::wifi_status,
      commands::wifi_connect,
      commands::wifi_disconnect,
      commands::wifi_forget,
      commands::wifi_saved_networks,
      commands::wifi_devices,
      commands::config_get,
      commands::config_set
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

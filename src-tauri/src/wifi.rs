use crate::app_config::AppConfig;
use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{process::{Command, Stdio}, time::Duration};
use wait_timeout::ChildExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiNetwork {
  pub ssid: String,
  pub security: WifiSecurity,
  pub signal: Option<i32>,
  pub known: bool,
  pub connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WifiSecurity {
  Open,
  Psk,
  #[serde(rename = "8021x")]
  Eap,
  Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiStatus {
  pub device: Option<String>,
  pub state: WifiState,
  pub connected_ssid: Option<String>,
  pub ip_v4: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WifiState {
  Connected,
  Disconnected,
  Connecting,
  Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedNetwork {
  pub ssid: String,
  pub security: WifiSecurity,
  pub last_connected: Option<String>,
}

fn sanitize_ssid(ssid: &str) -> Result<()> {
  let ssid = ssid.trim();
  if ssid.is_empty() {
    return Err(anyhow!("SSID is empty"));
  }
  if ssid.len() > 32 {
    return Err(anyhow!("SSID too long (max 32 characters)"));
  }
  if ssid.chars().any(|c| c.is_control()) {
    return Err(anyhow!("SSID contains control characters"));
  }
  Ok(())
}

fn sanitize_passphrase(passphrase: &str) -> Result<()> {
  if passphrase.len() < 8 || passphrase.len() > 63 {
    return Err(anyhow!("Passphrase must be 8–63 characters"));
  }
  if passphrase.chars().any(|c| c.is_control()) {
    return Err(anyhow!("Passphrase contains control characters"));
  }
  Ok(())
}

pub fn helper_path() -> Result<std::path::PathBuf> {
  // Prefer a system install path that matches our polkit policy file.
  let system = std::path::PathBuf::from("/usr/lib/wifiary/wifiary-helper");
  if system.exists() {
    return Ok(system);
  }
  let exe = std::env::current_exe().context("current_exe")?;
  Ok(exe.with_file_name("wifiary-helper"))
}

fn run_helper_json<T: for<'de> Deserialize<'de>>(
  args: &[String],
  timeout: Duration,
) -> Result<T> {
  let helper = helper_path()?;
  if !helper.exists() {
    return Err(anyhow!(
      "wifiary-helper not found at {}. Build it with `cargo build --bin wifiary-helper` or install it to /usr/lib/wifiary/wifiary-helper",
      helper.display()
    ));
  }

  // pkexec triggers polkit auth as needed. We never invoke a shell.
  let mut cmd = Command::new("pkexec");
  cmd.arg("--disable-internal-agent");
  cmd.arg(helper);
  let debug = std::env::var("WIFIARY_DEBUG").ok().is_some_and(|v| !v.trim().is_empty());
  if debug {
    // Clap global flag must come before the subcommand.
    cmd.arg("--debug");
  }
  for a in args {
    cmd.arg(a);
  }
  cmd.env("LC_ALL", "C");
  cmd.env("LANG", "C");
  cmd.stdin(Stdio::null());
  cmd.stdout(Stdio::piped());
  cmd.stderr(Stdio::piped());

  let mut child = cmd.spawn().context("spawn pkexec helper")?;
  let status = match child.wait_timeout(timeout).context("wait pkexec helper")? {
    Some(status) => status,
    None => {
      let _ = child.kill();
      return Err(anyhow!("Helper timed out"));
    }
  };
  let out = child
    .stdout
    .take()
    .map(|mut s| {
      use std::io::Read;
      let mut buf = String::new();
      let _ = s.read_to_string(&mut buf);
      buf
    })
    .unwrap_or_default();

  let stderr = child
    .stderr
    .take()
    .map(|mut s| {
      use std::io::Read;
      let mut buf = String::new();
      let _ = s.read_to_string(&mut buf);
      buf
    })
    .unwrap_or_default();

  if !stderr.trim().is_empty() {
    let trimmed = stderr.trim();
    if debug {
      eprintln!("[wifiary] wifiary-helper stderr:\n{trimmed}");
    } else {
      tracing::debug!(stderr = %trimmed, "wifiary-helper stderr");
    }
  }

  if !status.success() {
    return Err(anyhow!("Helper failed: {}", stderr.trim()));
  }

  serde_json::from_str(&out)
    .with_context(|| format!("parse helper JSON (stdout={} bytes, stderr={} bytes)", out.len(), stderr.len()))
}

fn run_helper_ok(args: &[String], timeout: Duration) -> Result<()> {
  let _v: serde_json::Value = run_helper_json(args, timeout)?;
  Ok(())
}

pub fn devices() -> Result<Vec<String>> {
  let devices: Vec<String> = run_helper_json(&vec!["devices".into()], Duration::from_secs(10))?;
  let re = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,31}$").expect("regex");
  let mut filtered = Vec::new();
  for d in devices {
    let trimmed = d.trim();
    if re.is_match(trimmed) {
      filtered.push(trimmed.to_string());
    } else {
      tracing::warn!(raw = %d, "Ignoring invalid device entry from helper");
    }
  }
  Ok(filtered)
}

pub fn scan(config: &AppConfig) -> Result<Vec<WifiNetwork>> {
  let device = device_or_detect(config)?;
  run_helper_json(
    &vec!["scan".into(), "--device".into(), device],
    Duration::from_secs(20),
  )
}

pub fn status(config: &AppConfig) -> Result<WifiStatus> {
  let device = device_or_detect(config).ok();
  if let Some(device) = device {
    return run_helper_json(
      &vec!["status".into(), "--device".into(), device],
      Duration::from_secs(10),
    );
  }
  Ok(WifiStatus {
    device: None,
    state: WifiState::Unknown,
    connected_ssid: None,
    ip_v4: None,
  })
}

pub fn connect(config: &AppConfig, ssid: &str, passphrase: Option<&str>) -> Result<()> {
  sanitize_ssid(ssid)?;
  if let Some(p) = passphrase {
    sanitize_passphrase(p)?;
  }
  let device = device_or_detect(config)?;
  let mut args = vec![
    "connect".into(),
    "--device".into(),
    device,
    "--ssid".into(),
    ssid.to_string(),
  ];
  if let Some(p) = passphrase {
    args.push("--passphrase".into());
    args.push(p.to_string());
  }
  run_helper_ok(&args, Duration::from_secs(60))
}

pub fn disconnect(config: &AppConfig) -> Result<()> {
  let device = device_or_detect(config)?;
  run_helper_ok(
    &vec!["disconnect".into(), "--device".into(), device],
    Duration::from_secs(20),
  )
}

pub fn forget(_config: &AppConfig, ssid: &str) -> Result<()> {
  sanitize_ssid(ssid)?;
  run_helper_ok(
    &vec!["forget".into(), "--ssid".into(), ssid.to_string()],
    Duration::from_secs(20),
  )
}

pub fn saved_networks(_config: &AppConfig) -> Result<Vec<SavedNetwork>> {
  run_helper_json(&vec!["saved".into()], Duration::from_secs(15))
}

fn device_or_detect(config: &AppConfig) -> Result<String> {
  if let Some(d) = &config.preferred_device {
    if !d.trim().is_empty() {
      return Ok(d.trim().to_string());
    }
  }
  detect_device()
}

fn detect_device() -> Result<String> {
  let list = devices()?;
  list.into_iter()
    .next()
    .ok_or_else(|| anyhow!("No wireless device detected"))
}

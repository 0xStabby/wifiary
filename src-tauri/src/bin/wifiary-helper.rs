use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use regex::Regex;
use serde::Serialize;
use std::{
  collections::HashSet,
  process::{Command, Stdio},
  time::Duration,
};
use wait_timeout::ChildExt;

#[derive(Debug, Parser)]
#[command(name = "wifiary-helper", version, about = "Privileged iwd helper (strict allowlist)")]
struct Cli {
  /// Print debug output to stderr (never to stdout, to keep JSON stable).
  #[arg(long)]
  debug: bool,
  #[command(subcommand)]
  command: Cmd,
}

#[derive(Debug, Subcommand)]
enum Cmd {
  Devices,
  Scan { #[arg(long)] device: String },
  Status { #[arg(long)] device: String },
  Connect {
    #[arg(long)]
    device: String,
    #[arg(long)]
    ssid: String,
    #[arg(long)]
    passphrase: Option<String>,
  },
  Disconnect { #[arg(long)] device: String },
  Forget { #[arg(long)] ssid: String },
  Saved,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WifiNetwork {
  ssid: String,
  security: String,
  signal: Option<i32>,
  known: bool,
  connected: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WifiStatus {
  device: String,
  state: String,
  connected_ssid: Option<String>,
  ip_v4: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedNetwork {
  ssid: String,
  security: String,
  last_connected: Option<String>,
}

fn main() {
  if let Err(e) = real_main() {
    eprintln!("{e:#}");
    std::process::exit(1);
  }
}

fn real_main() -> Result<()> {
  let cli = Cli::parse();
  match cli.command {
    Cmd::Devices => {
      let devices = device_list()?;
      print_json(&devices)?;
    }
    Cmd::Scan { device } => {
      validate_device(&device)?;
      // Ensure fresh results.
      if let Err(e) = iwctl(&["station", &device, "scan"]) {
        // If the user clicks scan multiple times, iwd may report this.
        let msg = e.to_string();
        if !msg.contains("Operation already in progress") {
          return Err(e);
        }
      }
      std::thread::sleep(Duration::from_millis(300));
      let known = known_networks_set()?;
      // Use dbm output so it is stable to parse (bars output is not).
      let out = iwctl(&["station", &device, "get-networks", "rssi-dbms"])?;
      if cli.debug {
        eprintln!("[wifiary-helper] get-networks (device={device}) output:\n{out}");
      }
      let networks = parse_network_table(&out, &known);
      if cli.debug {
        eprintln!("[wifiary-helper] parsed networks: {}", networks.len());
      }
      print_json(&networks)?;
    }
    Cmd::Status { device } => {
      validate_device(&device)?;
      let out = iwctl(&["station", &device, "show"])?;
      let (state, ssid) = parse_station_show(&out);
      let ip_v4 = ip_v4_addr(&device).ok();
      let status = WifiStatus {
        device,
        state,
        connected_ssid: ssid,
        ip_v4,
      };
      print_json(&status)?;
    }
    Cmd::Connect {
      device,
      ssid,
      passphrase,
    } => {
      validate_device(&device)?;
      validate_ssid(&ssid)?;
      if let Some(p) = &passphrase {
        validate_passphrase(p)?;
      }
      // iwctl options must come before commands. Also disable interactive prompts.
      let mut args: Vec<String> = vec!["--dont-ask".to_string()];
      if let Some(p) = passphrase {
        args.push("--passphrase".to_string());
        args.push(p);
      }
      args.extend([
        "station".to_string(),
        device,
        "connect".to_string(),
        ssid,
      ]);
      let args_ref = args.iter().map(|s| s.as_str()).collect::<Vec<_>>();
      let _ = iwctl(&args_ref)?;
      print_json(&serde_json::json!({ "ok": true }))?;
    }
    Cmd::Disconnect { device } => {
      validate_device(&device)?;
      let _ = iwctl(&["station", &device, "disconnect"])?;
      print_json(&serde_json::json!({ "ok": true }))?;
    }
    Cmd::Forget { ssid } => {
      validate_ssid(&ssid)?;
      let _ = iwctl(&["known-networks", &ssid, "forget"])?;
      print_json(&serde_json::json!({ "ok": true }))?;
    }
    Cmd::Saved => {
      let out = iwctl(&["known-networks", "list"])?;
      if cli.debug {
        eprintln!("[wifiary-helper] known-networks list output:\n{out}");
      }
      let saved = parse_known_networks_list(&out);
      if cli.debug {
        eprintln!("[wifiary-helper] parsed saved networks: {}", saved.len());
      }
      print_json(&saved)?;
    }
  }
  Ok(())
}

fn print_json(value: &impl Serialize) -> Result<()> {
  let json = serde_json::to_string(value)?;
  println!("{json}");
  Ok(())
}

fn run_with_timeout(mut cmd: Command, timeout: Duration) -> Result<String> {
  cmd.env("LC_ALL", "C");
  cmd.env("LANG", "C");
  // Make best-effort to discourage ANSI output, though some iwctl builds still emit it.
  cmd.env("TERM", "dumb");
  cmd.env("NO_COLOR", "1");
  cmd.stdin(Stdio::null());
  cmd.stdout(Stdio::piped());
  cmd.stderr(Stdio::piped());

  let mut child = cmd.spawn().context("spawn command")?;
  let status = match child.wait_timeout(timeout).context("wait command")? {
    Some(status) => status,
    None => {
      let _ = child.kill();
      return Err(anyhow!("command timed out"));
    }
  };

  let stdout = child
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

  if status.success() {
    return Ok(stdout);
  }

  let code = status.code().map(|c| c.to_string()).unwrap_or_else(|| "signal".into());
  let stderr = strip_ansi(&stderr);
  let stdout = strip_ansi(&stdout);
  let stderr_trimmed = stderr.trim();
  let stdout_trimmed = stdout.trim();

  if !stderr_trimmed.is_empty() {
    return Err(anyhow!("command failed (exit {code}): {stderr_trimmed}"));
  }
  if !stdout_trimmed.is_empty() {
    return Err(anyhow!("command failed (exit {code}), stdout: {stdout_trimmed}"));
  }
  Err(anyhow!("command failed (exit {code}) with no output"))
}

fn iwctl(args: &[&str]) -> Result<String> {
  let mut cmd = Command::new("iwctl");
  cmd.args(args);
  let out = run_with_timeout(cmd, Duration::from_secs(20)).context("iwctl")?;
  Ok(strip_ansi(&out))
}

fn device_list() -> Result<Vec<String>> {
  let out = iwctl(&["station", "list"])?;
  Ok(parse_station_list(&out))
}

fn validate_device(device: &str) -> Result<()> {
  if device.trim().is_empty() {
    return Err(anyhow!("device is empty"));
  }
  // Device names should be reasonable interface identifiers (e.g., wlan0).
  // Require the first char to be alphanumeric to avoid accidentally accepting table separators.
  let re = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,31}$").expect("regex");
  if !re.is_match(device) {
    return Err(anyhow!("invalid device name"));
  }
  Ok(())
}

fn validate_ssid(ssid: &str) -> Result<()> {
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

fn validate_passphrase(p: &str) -> Result<()> {
  if p.len() < 8 || p.len() > 63 {
    return Err(anyhow!("Passphrase must be 8–63 characters"));
  }
  if p.chars().any(|c| c.is_control()) {
    return Err(anyhow!("Passphrase contains control characters"));
  }
  Ok(())
}

fn parse_station_list(out: &str) -> Vec<String> {
  // Example:
  //   Devices in station mode
  //   ------------------------------------------------
  //   Name            Address          Powered  Adapter  Mode
  //   wlan0           xx:xx:...        on       ...      station
  //
  // `station list` can vary slightly, so we keep this permissive:
  // first column on non-header lines.
  let device_re = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,31}$").expect("regex");

  out.lines()
    .filter_map(|line| {
      let cleaned = strip_ansi(line);
      let trimmed = cleaned.trim();
      if trimmed.is_empty() {
        return None;
      }
      if trimmed.starts_with('-') {
        return None;
      }
      let lower = trimmed.to_ascii_lowercase();
      if lower.starts_with("name") || lower.contains("station mode") {
        return None;
      }
      let parts = trimmed.split_whitespace().collect::<Vec<_>>();
      if parts.is_empty() {
        return None;
      }
      let candidate = parts[0];
      if device_re.is_match(candidate) {
        Some(candidate.to_string())
      } else {
        None
      }
    })
    .collect()
}

fn known_networks_set() -> Result<HashSet<String>> {
  let out = iwctl(&["known-networks", "list"])?;
  let mut set = HashSet::new();
  for item in parse_known_networks_list(&out) {
    set.insert(item.ssid);
  }
  Ok(set)
}

fn parse_network_table(out: &str, known: &HashSet<String>) -> Vec<WifiNetwork> {
  out.lines()
    .filter(|l| !l.trim().is_empty())
    .filter(|l| !l.trim_start().starts_with('-'))
    .filter(|l| {
      let lower = strip_ansi(l).trim().to_ascii_lowercase();
      !lower.starts_with("network name")
        && !lower.starts_with("available networks")
        && !lower.starts_with("network")
    })
    .filter_map(|line| {
      let cleaned = strip_ansi(line).replace('\u{00a0}', " ").replace('\t', " ");
      let mut rest = cleaned.trim().to_string();

      let mut connected = false;
      if rest.starts_with('*') {
        connected = true;
        rest = rest[1..].trim_start().to_string();
      } else if rest.starts_with('>') {
        rest = rest[1..].trim_start().to_string();
      }

      let (left, signal_raw) = split_two_space_columns(&rest)?;
      let (ssid_raw, security_raw) = split_two_space_columns(left)?;

      let ssid = ssid_raw.trim().to_string();
      let security = normalize_security(security_raw.trim());
      let signal = parse_signal(signal_raw.trim());
      Some(WifiNetwork {
        ssid: ssid.clone(),
        security,
        signal,
        known: known.contains(&ssid),
        connected,
      })
    })
    .collect()
}

fn parse_station_show(out: &str) -> (String, Option<String>) {
  // Example:
  //   State             connected
  //   Connected network MyWifi
  let mut state: Option<String> = None;
  let mut ssid: Option<String> = None;
  for line in out.lines() {
    let trimmed = line.trim();
    let lower = trimmed.to_ascii_lowercase();
    if lower.starts_with("state") {
      let v = trimmed.split_whitespace().skip(1).collect::<Vec<_>>().join(" ");
      if !v.is_empty() {
        state = Some(v);
      }
    }
    if lower.starts_with("connected network") {
      let v = trimmed
        .split_whitespace()
        .skip(2)
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
      if !v.is_empty() {
        ssid = Some(v);
      }
    }
  }
  (state.unwrap_or_else(|| "unknown".to_string()), ssid)
}

fn parse_known_networks_list(out: &str) -> Vec<SavedNetwork> {
  out.lines()
    .filter(|l| !l.trim().is_empty())
    .filter(|l| !l.trim_start().starts_with('-'))
    .filter(|l| {
      let lower = strip_ansi(l).trim().to_ascii_lowercase();
      !lower.starts_with("name")
        && !lower.starts_with("known networks")
        && !lower.starts_with("stored networks")
    })
    .filter_map(|line| {
      let cleaned = strip_ansi(line).replace('\u{00a0}', " ").replace('\t', " ");
      let trimmed = cleaned.trim();
      if trimmed.is_empty() {
        return None;
      }

      // Format is typically:
      //   Name   Security   Type   Last connected
      // but can vary; parse from the right using 2+ spaces as delimiters.
      let (left1, last_raw) = split_two_space_columns(trimmed)?;
      let (left2, maybe_type_or_security) = split_two_space_columns(left1)?;

      // Attempt to parse 4 columns: ssid, security, type, last
      // If we can split one more time, we treat it as (ssid, security).
      let (ssid_raw, security_raw, _type_raw) = match split_two_space_columns(left2) {
        Some((ssid_raw, security_raw)) => (ssid_raw, security_raw, maybe_type_or_security),
        None => (left2, maybe_type_or_security, ""),
      };

      let ssid = ssid_raw.trim().to_string();
      if ssid.is_empty() {
        return None;
      }
      let security = normalize_security(security_raw.trim());
      let last = last_raw.trim().to_string();
      let last_connected = if last.is_empty() || last == "--" { None } else { Some(last) };
      Some(SavedNetwork {
        ssid,
        security,
        last_connected,
      })
    })
    .collect()
}

fn normalize_security(security: &str) -> String {
  let s = security.to_ascii_lowercase();
  if s.contains("open") || s == "--" {
    return "open".to_string();
  }
  if s.contains("psk") || s.contains("wpa") {
    return "psk".to_string();
  }
  if s.contains("8021x") || s.contains("eap") {
    return "8021x".to_string();
  }
  "unknown".to_string()
}

fn normalize_signal(signal: i32) -> i32 {
  // Some iwctl versions print dbm * 100 (e.g. -6400 == -64.00 dBm).
  let signal = if signal <= -1000 || signal >= 1000 {
    signal / 100
  } else {
    signal
  };
  if (0..=100).contains(&signal) {
    return signal;
  }
  if (-100..=0).contains(&signal) {
    let pct = (signal + 100) * 2;
    return pct.clamp(0, 100);
  }
  signal.clamp(0, 100)
}

fn strip_ansi(input: &str) -> String {
  // iwctl can emit ANSI escape sequences depending on environment.
  // Strip common CSI sequences to avoid leaking control codes into JSON/UI.
  let re_csi = Regex::new(r"\x1b\[[0-9;?]*[ -/]*[@-~]").expect("regex");
  // OSC sequences: ESC ] ... BEL or ESC ] ... ESC \
  let re_osc = Regex::new(r"\x1b\][^\x07]*(\x07|\x1b\\)").expect("regex");
  let without = re_csi.replace_all(input, "");
  let without = re_osc.replace_all(&without, "");
  without
    .replace('\r', "")
    .chars()
    .filter(|c| *c == '\n' || *c == '\t' || !c.is_control())
    .collect()
}

fn split_two_space_columns(line: &str) -> Option<(&str, &str)> {
  // Splits `line` into (left, right) at the last run of 2+ spaces.
  // This is more robust than splitting on all runs, and preserves SSIDs with spaces.
  let bytes = line.as_bytes();
  if bytes.len() < 2 {
    return None;
  }
  let mut idx: Option<usize> = None;
  for i in (0..bytes.len() - 1).rev() {
    if bytes[i] == b' ' && bytes[i + 1] == b' ' {
      idx = Some(i);
      break;
    }
  }
  let i = idx?;
  let mut j = i;
  while j < bytes.len() && bytes[j] == b' ' {
    j += 1;
  }
  let left = line[..i].trim_end();
  let right = line[j..].trim_start();
  if left.is_empty() || right.is_empty() {
    return None;
  }
  Some((left, right))
}

fn parse_signal(signal: &str) -> Option<i32> {
  if signal.is_empty() {
    return None;
  }
  // Bars output (e.g. ****) -> map to 0-100 in 4 steps.
  if signal.chars().all(|c| c == '*' || c == '_') {
    let stars = signal.chars().filter(|c| *c == '*').count() as i32;
    let pct = (stars * 25).clamp(0, 100);
    return Some(pct);
  }

  let num = signal.parse::<i32>().ok()?;
  Some(normalize_signal(num))
}

fn ip_v4_addr(device: &str) -> Result<String> {
  let mut cmd = Command::new("ip");
  cmd.args(["-j", "address", "show", "dev", device]);
  let out = run_with_timeout(cmd, Duration::from_secs(6))?;
  let json: serde_json::Value = serde_json::from_str(&out).context("parse ip -j")?;
  let arr = json.as_array().ok_or_else(|| anyhow!("ip output invalid"))?;
  for iface in arr {
    if let Some(info) = iface.get("addr_info").and_then(|v| v.as_array()) {
      for a in info {
        if a.get("family").and_then(|v| v.as_str()) == Some("inet") {
          if let Some(local) = a.get("local").and_then(|v| v.as_str()) {
            return Ok(local.to_string());
          }
        }
      }
    }
  }
  Err(anyhow!("no IPv4 address"))
}

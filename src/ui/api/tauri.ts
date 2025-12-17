import { invoke } from "@tauri-apps/api/core";

export async function tauriInvoke<T>(cmd: string, payload?: Record<string, unknown>) {
  return invoke<T>(cmd, payload);
}


//// filepath: /Users/jorgypzk/asistime/src/lib/health.ts
// Health check via Tauri invoke (Rust command: health_check)
import { invoke } from "@tauri-apps/api/core";

interface HealthOpts {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export async function healthCheck(opts?: HealthOpts): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 4000;
  const retries = opts?.retries ?? 0;
  const retryDelayMs = opts?.retryDelayMs ?? 400;

  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const result = await Promise.race<boolean>([
        invoke<boolean>("health_check"),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs)
        ),
      ]);
      if (result !== true) throw new Error("unhealthy");
      return true;
    } catch (e) {
      if (attempt > retries) throw e;
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }
}
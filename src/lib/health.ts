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
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

  let attempt = 0;

  while (true) {
    attempt++;
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const result = await Promise.race<boolean>([
          invoke<boolean>("health_check"),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs)
          ),
        ]);
        if (result !== true) throw new Error("unhealthy");
      } else {
        if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");

        const response = await fetch(`${apiBaseUrl}/health`, {
          method: "GET",
        });
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      }
      return true;
    } catch (e) {
      if (attempt > retries) throw e;
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }
}
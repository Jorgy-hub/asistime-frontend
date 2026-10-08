import { invoke } from "@tauri-apps/api/core";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const isTauri = () => typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

const webRequest = async (path: string, init?: RequestInit) => {
  if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.detail || text || `Request failed: ${response.status}`);
  return body;
};

export async function getAppUri(id: string): Promise<string> {
  if (isTauri()) return invoke<string>("app_get_uri", { id });
  const body = await webRequest(`/schools/${id}/getUri`);
  const uri = typeof body === "string" ? body : body?.redirect_uri ?? body?.app_uri;
  if (typeof uri !== "string") throw new Error("La escuela no tiene una URL configurada");
  return uri;
}

export async function updateAppUri(id: string, newRedirectUri: string): Promise<void> {
  if (isTauri()) {
    await invoke("app_update_uri", { id, newRedirectUri });
    return;
  }
  await webRequest("/schools/updateUri", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, app_uri: newRedirectUri.trim() }),
  }); 
}
import { invoke } from "@tauri-apps/api/core";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const isTauri = () => typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

async function webRequest(path: string, init?: RequestInit) {
  if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL no está configurada");
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = typeof body === "object" && body?.detail ? body.detail : text;
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return body;
}

export type User = {
  id?: string | number;
  username: string;
  password: string; // required by backend
  admin: boolean;
  permissions: string[];
  refresh_token?: string | null;
  school_id?: string | null;
};

export type CreateUserInput = {
  username: string;
  password: string;
  admin: boolean;
  permissions: string[];
  school_id?: string | null;
};

export async function listUsers(): Promise<User[]> {
  if (isTauri()) return await invoke<User[]>("list_users");
  return await webRequest("/user/all");
}

export async function createUser(input: CreateUserInput): Promise<void> {
  const user: User = {
    username: input.username,
    password: input.password,
    admin: input.admin,
    permissions: input.permissions,
    refresh_token: null,
    school_id: input.school_id,
  };
  if (isTauri()) {
    await invoke("create_user", { user });
  } else {
    await webRequest("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });
  }
}

export async function updateUser(
  id: string | number,
  input: { username: string; password: string; admin: boolean; permissions: string[]; refresh_token?: string | null; school_id?: string | null }
): Promise<void> {
  const user: User = {
    username: input.username,
    password: input.password, // send empty string to keep current (backend should treat "" as no change)
    admin: input.admin,
    permissions: input.permissions,
    refresh_token: input.refresh_token ?? null,
    school_id: input.school_id,
  };
  if (isTauri()) {
    await invoke("update_user", { user });
  } else {
    await webRequest("/auth/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });
  }
}

export async function deleteUser(username: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_user", { username });
  } else {
    await webRequest("/auth/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
  }
}
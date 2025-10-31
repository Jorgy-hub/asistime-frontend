import { invoke } from "@tauri-apps/api/core";

export type User = {
  id?: string | number;
  username: string;
  password: string; // required by backend
  admin: boolean;
  permissions: string[];
  refresh_token?: string | null;
};

export type CreateUserInput = {
  username: string;
  password: string;
  admin: boolean;
  permissions: string[];
};

export async function listUsers(): Promise<User[]> {
  return await invoke<User[]>("list_users");
}

export async function createUser(input: CreateUserInput): Promise<void> {
  const user: User = {
    username: input.username,
    password: input.password,
    admin: input.admin,
    permissions: input.permissions,
    refresh_token: null,
  };
  await invoke("create_user", { user });
}

export async function updateUser(
  id: string | number,
  input: { username: string; password: string; admin: boolean; permissions: string[]; refresh_token?: string | null }
): Promise<void> {
  const user: User = {
    username: input.username,
    password: input.password, // send empty string to keep current (backend should treat "" as no change)
    admin: input.admin,
    permissions: input.permissions,
    refresh_token: input.refresh_token ?? null,
  };
  await invoke("update_user", { user });
}

export async function deleteUser(username: string): Promise<void> {
  await invoke("delete_user", { username });
}
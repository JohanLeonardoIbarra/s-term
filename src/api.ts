import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionInput,
  ConnectionView,
  KeyInput,
  KeyView,
} from "./types";

// ---- Vault ----------------------------------------------------------------

export function vaultExists(): Promise<boolean> {
  return invoke("vault_exists");
}

export function vaultIsUnlocked(): Promise<boolean> {
  return invoke("vault_is_unlocked");
}

export function initVault(password: string): Promise<void> {
  return invoke("init_vault", { password });
}

export function unlockVault(password: string): Promise<void> {
  return invoke("unlock_vault", { password });
}

export function lockVault(): Promise<void> {
  return invoke("lock_vault");
}

// ---- Connections ----------------------------------------------------------

export function listConnections(): Promise<ConnectionView[]> {
  return invoke("list_connections");
}

export function addConnection(input: ConnectionInput): Promise<ConnectionView> {
  return invoke("add_connection", { input });
}

export function updateConnection(
  id: string,
  input: ConnectionInput
): Promise<ConnectionView> {
  return invoke("update_connection", { id, input });
}

export function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

// ---- SSH keys -------------------------------------------------------------

export function listKeys(): Promise<KeyView[]> {
  return invoke("list_keys");
}

export function addKey(input: KeyInput): Promise<KeyView> {
  return invoke("add_key", { input });
}

export function deleteKey(id: string): Promise<void> {
  return invoke("delete_key", { id });
}

/** Reads a private key file (.pem / OpenSSH) from disk and returns its contents. */
export function readKeyFile(path: string): Promise<string> {
  return invoke("read_key_file", { path });
}

// ---- Sessions -------------------------------------------------------------

export function createLocalSession(
  cols: number,
  rows: number
): Promise<string> {
  return invoke("create_local_session", { cols, rows });
}

export function connectSsh(
  connectionId: string,
  cols: number,
  rows: number
): Promise<string> {
  return invoke("connect_ssh", { connectionId, cols, rows });
}

export function writeSession(id: string, data: string): Promise<void> {
  return invoke("write_session", { id, data });
}

export function resizeSession(
  id: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke("resize_session", { id, cols, rows });
}

export function closeSession(id: string): Promise<void> {
  return invoke("close_session", { id });
}

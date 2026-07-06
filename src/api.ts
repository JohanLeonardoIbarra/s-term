import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionInput,
  ConnectionView,
  KeyInput,
  KeyView,
  TerminalInfo,
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

// ---- Backup (export / import) ---------------------------------------------

/** Writes an encrypted backup of all connections + keys to `path`. */
export function exportConnections(
  path: string,
  password: string
): Promise<void> {
  return invoke("export_connections", { path, password });
}

/** Imports connections + keys from an encrypted backup. Returns count imported. */
export function importConnections(
  path: string,
  password: string
): Promise<number> {
  return invoke("import_connections", { path, password });
}

/** Writes a CSV template (headers + example row) to the given path. */
export function downloadCsvTemplate(path: string): Promise<void> {
  return invoke("download_csv_template", { path });
}

/** Imports connections from a CSV file. Returns count + per-row errors. */
export function importCsv(
  path: string
): Promise<{ imported: number; errors: string[] }> {
  return invoke("import_csv", { path });
}

// ---- Sessions -------------------------------------------------------------

export function listTerminals(): Promise<TerminalInfo[]> {
  return invoke("list_terminals");
}

export function createLocalSession(
  cols: number,
  rows: number,
  terminal?: string
): Promise<string> {
  return invoke("create_local_session", { cols, rows, terminal });
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

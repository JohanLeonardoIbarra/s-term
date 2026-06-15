export type AuthMethod = "key" | "password" | "agent";

export interface ConnectionView {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  keyId: string | null;
  group: string | null;
}

export interface KeyView {
  id: string;
  name: string;
}

export interface ConnectionInput {
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  /** Only sent when authMethod === "password". */
  password?: string | null;
  /** Reference to a stored key when authMethod === "key". */
  keyId?: string | null;
  group?: string | null;
}

export interface KeyInput {
  name: string;
  /** PEM or OpenSSH private key contents. */
  privateKey: string;
  passphrase?: string | null;
}

export type SessionKind = "local" | "ssh";

export interface Session {
  id: string;
  title: string;
  kind: SessionKind;
  connectionId?: string;
}

/** Payload of the `pty://data` event. */
export interface PtyDataEvent {
  id: string;
  data: string;
}

/** Payload of the `pty://exit` event. */
export interface PtyExitEvent {
  id: string;
  code: number | null;
}

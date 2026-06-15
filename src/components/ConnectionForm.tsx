import { FormEvent, useState } from "react";
import { addConnection, updateConnection } from "../api";
import type {
  AuthMethod,
  ConnectionInput,
  ConnectionView,
  KeyView,
} from "../types";

interface Props {
  keys: KeyView[];
  existing: ConnectionView | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function ConnectionForm({
  keys,
  existing,
  onSaved,
  onClose,
}: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [host, setHost] = useState(existing?.host ?? "");
  const [port, setPort] = useState(existing?.port ?? 22);
  const [username, setUsername] = useState(existing?.username ?? "");
  const [group, setGroup] = useState(existing?.group ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    existing?.authMethod ?? "key"
  );
  const [keyId, setKeyId] = useState<string>(existing?.keyId ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !host.trim() || !username.trim()) {
      setError("Name, host and username are required.");
      return;
    }
    if (authMethod === "key" && !keyId) {
      setError("Select a stored key or add one first.");
      return;
    }
    const input: ConnectionInput = {
      name: name.trim(),
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authMethod,
      group: group.trim() ? group.trim() : null,
      keyId: authMethod === "key" ? keyId : null,
      password: authMethod === "password" ? password : null,
    };
    setBusy(true);
    try {
      if (existing) {
        await updateConnection(existing.id, input);
      } else {
        await addConnection(input);
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existing ? "Edit connection" : "New connection"}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="row">
            <label style={{ flex: 3 }}>
              Host
              <input value={host} onChange={(e) => setHost(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              Port
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Group (optional)
            <input value={group} onChange={(e) => setGroup(e.target.value)} />
          </label>
          <label>
            Authentication
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
            >
              <option value="key">Private key</option>
              <option value="password">Password</option>
              <option value="agent">SSH agent</option>
            </select>
          </label>
          {authMethod === "key" && (
            <label>
              Key
              <select value={keyId} onChange={(e) => setKeyId(e.target.value)}>
                <option value="">— select a key —</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {authMethod === "password" && (
            <label>
              Password {existing && "(leave blank to keep current)"}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save connection"}
          </button>
        </form>
      </div>
    </div>
  );
}

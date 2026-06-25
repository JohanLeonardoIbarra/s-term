import { FormEvent, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { addKey, deleteKey, readKeyFile } from "../api";
import type { KeyView } from "../types";

interface Props {
  keys: KeyView[];
  onChange: () => void;
  onClose: () => void;
  onDeleteKey?: (id: string, name: string) => void;
}

export default function KeyManager({ keys, onChange, onClose, onDeleteKey }: Props) {
  const [name, setName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImportFile() {
    setError(null);
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: "Private key", extensions: ["pem", "key", "ppk"] },
          { name: "All files", extensions: ["*"] },
        ],
      });
      if (typeof selected === "string") {
        const content = await readKeyFile(selected);
        setPrivateKey(content);
        if (!name) {
          const base = selected.split(/[\\/]/).pop() ?? "key";
          setName(base);
        }
      }
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !privateKey.trim()) {
      setError("Name and private key contents are required.");
      return;
    }
    setBusy(true);
    try {
      await addKey({
        name: name.trim(),
        privateKey,
        passphrase: passphrase ? passphrase : null,
      });
      setName("");
      setPrivateKey("");
      setPassphrase("");
      onChange();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(id: string, name: string) {
    if (onDeleteKey) {
      onDeleteKey(id, name);
    } else {
      deleteKey(id).then(() => onChange());
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>SSH keys</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="key-list">
          {keys.length === 0 && <p className="muted">No keys stored yet.</p>}
          {keys.map((k) => (
            <div key={k.id} className="key-row">
              <span>🔑 {k.name}</span>
              <button className="link-danger" onClick={() => handleDelete(k.id, k.name)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="form">
          <h3>Add a key</h3>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. prod-server"
            />
          </label>
          <label>
            Private key (.pem / OpenSSH)
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              rows={6}
            />
          </label>
          <button type="button" className="secondary" onClick={handleImportFile}>
            Import from file…
          </button>
          <label>
            Passphrase (optional)
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save key"}
          </button>
        </form>
      </div>
    </div>
  );
}

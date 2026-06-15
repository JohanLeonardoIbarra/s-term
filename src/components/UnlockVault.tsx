import { FormEvent, useEffect, useState } from "react";
import { initVault, unlockVault, vaultExists } from "../api";

interface Props {
  onUnlocked: () => void;
}

export default function UnlockVault({ onUnlocked }: Props) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    vaultExists().then(setExists).catch(() => setExists(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Enter a master password.");
      return;
    }
    if (!exists && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (exists) {
        await unlockVault(password);
      } else {
        await initVault(password);
      }
      onUnlocked();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (exists === null) {
    return <div className="vault-screen">Loading…</div>;
  }

  return (
    <div className="vault-screen">
      <form className="vault-card" onSubmit={handleSubmit}>
        <h1>s-term</h1>
        <p className="vault-subtitle">
          {exists
            ? "Enter your master password to unlock the connection vault."
            : "Create a master password to encrypt your SSH connections and keys."}
        </p>
        <input
          type="password"
          placeholder="Master password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
        />
        {!exists && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? "Working…" : exists ? "Unlock" : "Create vault"}
        </button>
        {!exists && (
          <p className="vault-hint">
            There is no password recovery. If you lose this password, the
            encrypted data cannot be read.
          </p>
        )}
      </form>
    </div>
  );
}

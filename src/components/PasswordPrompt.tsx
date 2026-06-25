import { FormEvent, useState } from "react";
import Close from "@mui/icons-material/Close";

interface Props {
  title: string;
  description?: string;
  confirm: boolean;
  submitLabel: string;
  onSubmit: (password: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function PasswordPrompt({
  title,
  description,
  confirm,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Enter a password.");
      return;
    }
    if (confirm && password !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onCancel}>
            <Close fontSize="small" />
          </button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          {description && <p className="muted">{description}</p>}
          <label>
            Password
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {confirm && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </label>
          )}
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? "Working…" : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

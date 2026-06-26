import { useState, useEffect } from "react";
import { initVault, unlockVault, vaultExists } from "../../../api";
import { useTranslation } from "../../../i18n";
import styles from "./UnlockVault.module.css";

interface Props {
  onUnlocked: () => void;
}

export default function UnlockVault({ onUnlocked }: Props) {
  const { t } = useTranslation();
  const [exists, setExists] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    vaultExists().then(setExists).catch(() => setExists(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError(t("vault.enterPassword"));
      return;
    }
    if (!exists && password !== confirm) {
      setError(t("vault.noMatch"));
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
    return <div className={styles.screen}>{t("vault.loading")}</div>;
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>s-term</h1>
        <p className={styles.subtitle}>
          {exists
            ? t("vault.unlockSubtitle")
            : t("vault.createSubtitle")}
        </p>
        <input
          type="password"
          placeholder={t("vault.masterPassword")}
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
        />
        {!exists && (
          <input
            type="password"
            placeholder={t("vault.confirmPassword")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? t("vault.working") : exists ? t("vault.unlock") : t("vault.create")}
        </button>
        {!exists && (
          <p className={styles.hint}>
            {t("vault.hint")}
          </p>
        )}
      </form>
    </div>
  );
}

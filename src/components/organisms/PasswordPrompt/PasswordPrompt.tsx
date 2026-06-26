import { useState } from "react";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import FormField from "../../molecules/FormField";
import TextInput from "../../atoms/TextInput";
import Button from "../../atoms/Button";
import ErrorText from "../../atoms/ErrorText";
import { useTranslation } from "../../../i18n";
import styles from "./PasswordPrompt.module.css";

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
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError(t("prompt.enterPassword"));
      return;
    }
    if (confirm && password !== confirmPw) {
      setError(t("prompt.noMatch"));
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
    <Modal onBackdrop={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <form className={styles.form} onSubmit={handleSubmit}>
        {description && <p className={styles.muted}>{description}</p>}
        <FormField label={t("prompt.password")}>
          <TextInput
            type="password"
            value={password}
            autoFocus
            onChange={setPassword}
          />
        </FormField>
        {confirm && (
          <FormField label={t("prompt.confirmPassword")}>
            <TextInput
              type="password"
              value={confirmPw}
              onChange={setConfirmPw}
            />
          </FormField>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={busy}>
          {busy ? t("prompt.working") : submitLabel}
        </Button>
      </form>
    </Modal>
  );
}

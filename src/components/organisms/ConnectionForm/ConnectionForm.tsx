import { useState } from "react";
import { addConnection, updateConnection } from "../../../api";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import FormField from "../../molecules/FormField";
import TextInput from "../../atoms/TextInput";
import Select from "../../atoms/Select";
import Button from "../../atoms/Button";
import ErrorText from "../../atoms/ErrorText";
import { useTranslation } from "../../../i18n";
import type {
  AuthMethod,
  ConnectionInput,
  ConnectionView,
  KeyView,
} from "../../../types";
import styles from "./ConnectionForm.module.css";

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
  const { t } = useTranslation();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !host.trim() || !username.trim()) {
      setError(t("conn.errRequired"));
      return;
    }
    if (authMethod === "key" && !keyId) {
      setError(t("conn.errKey"));
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

  const keyOptions = keys.map((k) => ({ value: k.id, label: k.name }));
  const authOptions = [
    { value: "key", label: t("conn.auth.key") },
    { value: "password", label: t("conn.auth.password") },
    { value: "agent", label: t("conn.auth.agent") },
  ];

  return (
    <Modal onBackdrop={onClose}>
      <ModalHeader title={existing ? t("conn.edit") : t("conn.new")} onClose={onClose} />
      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label={t("conn.name")}>
          <TextInput value={name} onChange={setName} />
        </FormField>
        <div className={styles.row}>
          <FormField label={t("conn.host")} flex={3}>
            <TextInput value={host} onChange={setHost} />
          </FormField>
          <FormField label={t("conn.port")} flex={1}>
            <TextInput type="number" value={port} onChange={(v) => setPort(Number(v))} />
          </FormField>
        </div>
        <FormField label={t("conn.username")}>
          <TextInput value={username} onChange={setUsername} />
        </FormField>
        <FormField label={t("conn.group")}>
          <TextInput value={group} onChange={setGroup} />
        </FormField>
        <FormField label={t("conn.auth")}>
          <Select
            value={authMethod}
            options={authOptions}
            onChange={(v) => setAuthMethod(v as AuthMethod)}
          />
        </FormField>
        {authMethod === "key" && (
          <FormField label={t("conn.key")}>
            <Select
              value={keyId}
              options={[{ value: "", label: t("conn.selectKey") }, ...keyOptions]}
              onChange={setKeyId}
            />
          </FormField>
        )}
        {authMethod === "password" && (
          <FormField
            label={t("conn.password")}
            hint={existing && <small className={styles.muted}>{t("conn.passwordKeep")}</small>}
          >
            <TextInput type="password" value={password} onChange={setPassword} />
          </FormField>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={busy}>
          {busy ? t("conn.saving") : t("conn.save")}
        </Button>
      </form>
    </Modal>
  );
}

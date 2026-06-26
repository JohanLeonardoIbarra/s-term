import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { addKey, deleteKey, readKeyFile } from "../../../api";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import FormField from "../../molecules/FormField";
import TextInput from "../../atoms/TextInput";
import TextArea from "../../atoms/TextArea";
import Button from "../../atoms/Button";
import ErrorText from "../../atoms/ErrorText";
import KeyRow from "../../molecules/KeyRow";
import { useTranslation } from "../../../i18n";
import type { KeyView } from "../../../types";
import styles from "./KeyManager.module.css";

interface Props {
  keys: KeyView[];
  onChange: () => void;
  onClose: () => void;
  onDeleteKey?: (id: string, name: string) => void;
}

export default function KeyManager({
  keys,
  onChange,
  onClose,
  onDeleteKey,
}: Props) {
  const { t } = useTranslation();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !privateKey.trim()) {
      setError(t("keys.errRequired"));
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
    <Modal onBackdrop={onClose}>
      <ModalHeader title={t("keys.title")} onClose={onClose} />
      <div className={styles.list}>
        {keys.length === 0 && <p className={styles.muted}>{t("keys.empty")}</p>}
        {keys.map((k) => (
          <KeyRow key={k.id} keyView={k} onDelete={() => handleDelete(k.id, k.name)} />
        ))}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>{t("keys.addTitle")}</h3>
        <FormField label={t("keys.name")}>
          <TextInput
            value={name}
            onChange={setName}
            placeholder={t("keys.namePlaceholder")}
          />
        </FormField>
        <FormField label={t("keys.private")}>
          <TextArea
            value={privateKey}
            onChange={setPrivateKey}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            rows={6}
          />
        </FormField>
        <Button type="button" variant="secondary" onClick={handleImportFile}>
          {t("keys.importFile")}
        </Button>
        <FormField label={t("keys.passphrase")}>
          <TextInput type="password" value={passphrase} onChange={setPassphrase} />
        </FormField>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" disabled={busy}>
          {busy ? t("keys.saving") : t("keys.save")}
        </Button>
      </form>
    </Modal>
  );
}

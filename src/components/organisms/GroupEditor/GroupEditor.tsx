import { useState, useMemo } from "react";
import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import ModalFooter from "../../molecules/ModalFooter";
import FormField from "../../molecules/FormField";
import TextInput from "../../atoms/TextInput";
import Button from "../../atoms/Button";
import Switch from "../../atoms/Switch";
import ErrorText from "../../atoms/ErrorText";
import { useTranslation } from "../../../i18n";
import styles from "./GroupEditor.module.css";

interface Props {
  groupName: string;
  existingGroups: string[];
  blockTransfer: boolean;
  onSave: (newName: string, blockTransfer: boolean) => Promise<void> | void;
  onDelete: () => void;
  onClose: () => void;
}

export default function GroupEditor({
  groupName,
  existingGroups,
  blockTransfer,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(groupName);
  const [isBlocked, setIsBlocked] = useState(blockTransfer);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [busy, setBusy] = useState(false);

  const otherGroups = useMemo(
    () => existingGroups.filter((g) => g !== groupName),
    [existingGroups, groupName]
  );

  const handleSave = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("group.errRequired"));
      return;
    }
    if (trimmed !== groupName && otherGroups.includes(trimmed)) {
      setError(t("group.errDuplicate"));
      return;
    }
    setBusy(true);
    try {
      onSave(trimmed, isBlocked);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteText("");
  };

  const handleConfirmDelete = () => {
    if (deleteText.trim().toLowerCase() === "delete") {
      setBusy(true);
      try {
        onDelete();
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <>
      <Modal onBackdrop={onClose}>
        <ModalHeader title={t("group.editTitle")} onClose={onClose} />
        <div className={styles.form}>
          <FormField label={t("group.name")}>
            <TextInput value={name} onChange={setName} autoFocus />
          </FormField>

          <div className={styles.switchRow}>
            <Switch
              checked={isBlocked}
              onChange={setIsBlocked}
              label={t("group.blockTransfer")}
            />
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          <ModalFooter>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {t("confirm.cancel")}
            </Button>
            <Button variant="secondary" onClick={handleDeleteClick} disabled={busy}>
              {t("group.delete")}
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {t("group.save")}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {showDeleteConfirm && (
        <Modal onBackdrop={() => setShowDeleteConfirm(false)}>
          <ModalHeader title={t("group.deleteTitle")} onClose={() => setShowDeleteConfirm(false)} />
          <div className={styles.form}>
            <p className={styles.muted}>{t("group.deleteMessage")}</p>
            <FormField label={t("group.deleteConfirm")}>
              <TextInput value={deleteText} onChange={setDeleteText} autoFocus />
            </FormField>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                {t("confirm.cancel")}
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteText.trim().toLowerCase() !== "delete" || busy}
              >
                {t("confirm.confirm")}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </>
  );
}

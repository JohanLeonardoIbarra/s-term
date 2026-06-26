import Modal from "../../molecules/Modal";
import ModalHeader from "../../molecules/ModalHeader";
import ModalFooter from "../../molecules/ModalFooter";
import Button from "../../atoms/Button";
import { useTranslation } from "../../../i18n";
import styles from "./ConfirmModal.module.css";

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal onBackdrop={onCancel}>
      <ModalHeader title={title} onClose={onCancel} />
      <div className={styles.form}>
        <p className={styles.muted}>{message}</p>
        <ModalFooter>
          <Button variant="secondary" onClick={onCancel}>
            {t("confirm.cancel")}
          </Button>
          <Button onClick={onConfirm}>{t("confirm.confirm")}</Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

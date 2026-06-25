import Close from "@mui/icons-material/Close";
import { useTranslation } from "../i18n";

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
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onCancel}>
            <Close fontSize="small" />
          </button>
        </div>
        <div className="form">
          <p className="muted">{message}</p>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: "12px" }}>
            <button className="secondary" onClick={onCancel}>
              {t("confirm.cancel")}
            </button>
            <button className="primary" onClick={onConfirm}>
              {t("confirm.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import Close from "@mui/icons-material/Close";

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
              Cancel
            </button>
            <button className="primary" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

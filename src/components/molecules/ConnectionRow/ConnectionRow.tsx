import type { DraggableProvided } from "@hello-pangea/dnd";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import IconButton from "../../atoms/IconButton";
import { useTranslation } from "../../../i18n";
import type { ConnectionView } from "../../../types";
import styles from "./ConnectionRow.module.css";

interface Props {
  connection: ConnectionView;
  className?: string;
  disabled?: boolean;
  provided?: DraggableProvided;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ConnectionRow({
  connection,
  className = "",
  disabled = false,
  provided,
  onConnect,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const classes = [styles.row, className].filter(Boolean).join(" ");
  return (
    <div 
      ref={provided?.innerRef}
      className={classes}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
    >
      <div
        className={[styles.main, disabled ? styles.disabled : ""].filter(Boolean).join(" ")}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) onConnect();
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onConnect();
          }
        }}
        title={`${connection.username}@${connection.host}:${connection.port}`}
      >
        <span className={`${styles.name} code-md`} title={connection.name}>
          {connection.name}
        </span>
        <span className={`${styles.sub} code-sm`}>
          {connection.username}@{connection.host}
        </span>
      </div>
      <div className={styles.actions}>
        <IconButton title={t("sidebar.edit")} onClick={onEdit}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton title={t("sidebar.delete")} onClick={onDelete}>
          <Delete fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
}

import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import IconButton from "../../atoms/IconButton";
import { useTranslation } from "../../../i18n";
import type { ConnectionView } from "../../../types";
import styles from "./ConnectionRow.module.css";

interface Props {
  connection: ConnectionView;
  disabled?: boolean;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ConnectionRow({
  connection,
  disabled = false,
  onConnect,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className={styles.row}>
      <button
        className={styles.main}
        onClick={onConnect}
        disabled={disabled}
        title={`${connection.username}@${connection.host}:${connection.port}`}
      >
        <span className={`${styles.name} code-md`}>{connection.name}</span>
        <span className={`${styles.sub} code-sm`}>
          {connection.username}@{connection.host}
        </span>
      </button>
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

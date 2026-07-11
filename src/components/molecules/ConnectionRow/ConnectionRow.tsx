import { useState } from "react";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import DragIndicator from "@mui/icons-material/DragIndicator";
import IconButton from "../../atoms/IconButton";
import { useTranslation } from "../../../i18n";
import type { ConnectionView } from "../../../types";
import styles from "./ConnectionRow.module.css";

interface Props {
  connection: ConnectionView;
  className?: string;
  disabled?: boolean;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ConnectionRow({
  connection,
  className = "",
  disabled = false,
  onConnect,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftFifth = x < rect.width / 10;
    setIsHoveringLeft(isLeftFifth);
  };
  
  const handleMouseLeave = () => {
    setIsHoveringLeft(false);
  };
  
  const classes = [styles.row, isHoveringLeft ? styles.handleVisible : "", className].filter(Boolean).join(" ");
  return (
    <div 
      className={classes}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={styles.handle}
        data-drag-handle
        title={t("sidebar.dragToReorder")}
        onClick={(e) => e.stopPropagation()}
      >
        <DragIndicator fontSize="small" />
      </span>
      <button
        className={styles.main}
        onClick={onConnect}
        disabled={disabled}
        title={`${connection.username}@${connection.host}:${connection.port}`}
      >
        <span className={`${styles.name} code-md`} title={connection.name}>
          {connection.name}
        </span>
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

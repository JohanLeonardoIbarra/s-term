import type { ReactNode } from "react";
import Close from "@mui/icons-material/Close";
import IconButton from "../../atoms/IconButton";
import styles from "./ModalHeader.module.css";

interface Props {
  title: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
}

export default function ModalHeader({ title, icon, onClose }: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.titleWrap}>
        {icon}
        <h2 className={styles.title}>{title}</h2>
      </div>
      <IconButton onClick={onClose}>
        <Close fontSize="small" />
      </IconButton>
    </div>
  );
}

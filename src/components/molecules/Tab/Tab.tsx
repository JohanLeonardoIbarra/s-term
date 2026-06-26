import Public from "@mui/icons-material/Public";
import TerminalIcon from "@mui/icons-material/Terminal";
import Close from "@mui/icons-material/Close";
import type { Session } from "../../../types";
import styles from "./Tab.module.css";

interface Props {
  session: Session;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export default function Tab({ session, active, onSelect, onClose }: Props) {
  const classes = [styles.tab, active ? styles.active : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} onClick={onSelect}>
      <span className={styles.icon}>
        {session.kind === "ssh" ? (
          <Public fontSize="small" />
        ) : (
          <TerminalIcon fontSize="small" />
        )}
      </span>
      <span className={styles.title}>{session.title}</span>
      <button
        className={styles.close}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <Close fontSize="small" />
      </button>
    </div>
  );
}

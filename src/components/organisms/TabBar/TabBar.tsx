import Tab from "../../molecules/Tab";
import type { Session } from "../../../types";
import styles from "./TabBar.module.css";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function TabBar({ sessions, activeId, onSelect, onClose }: Props) {
  return (
    <div className={styles.tabbar}>
      {sessions.map((s) => (
        <Tab
          key={s.id}
          session={s}
          active={s.id === activeId}
          onSelect={() => onSelect(s.id)}
          onClose={() => onClose(s.id)}
        />
      ))}
    </div>
  );
}

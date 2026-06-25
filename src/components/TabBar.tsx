import type { Session } from "../types";
import Public from "@mui/icons-material/Public";
import Terminal from "@mui/icons-material/Terminal";
import Close from "@mui/icons-material/Close";

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function TabBar({ sessions, activeId, onSelect, onClose }: Props) {
  return (
    <div className="tabbar">
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`tab ${s.id === activeId ? "active" : ""}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="tab-icon">
            {s.kind === "ssh" ? (
              <Public fontSize="small" />
            ) : (
              <Terminal fontSize="small" />
            )}
          </span>
          <span className="tab-title">{s.title}</span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose(s.id);
            }}
          >
            <Close fontSize="small" />
          </button>
        </div>
      ))}
    </div>
  );
}

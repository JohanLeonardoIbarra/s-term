import type { Session } from "../types";

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
          <span className="tab-icon">{s.kind === "ssh" ? "🌐" : "❯"}</span>
          <span className="tab-title">{s.title}</span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose(s.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

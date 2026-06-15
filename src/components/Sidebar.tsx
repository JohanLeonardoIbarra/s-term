import { useMemo } from "react";
import type { ConnectionView } from "../types";

interface Props {
  connections: ConnectionView[];
  onConnect: (c: ConnectionView) => void;
  onNewLocal: () => void;
  onNewConnection: () => void;
  onEditConnection: (c: ConnectionView) => void;
  onDeleteConnection: (c: ConnectionView) => void;
  onManageKeys: () => void;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
}

export default function Sidebar({
  connections,
  onConnect,
  onNewLocal,
  onNewConnection,
  onEditConnection,
  onDeleteConnection,
  onManageKeys,
  onExport,
  onImport,
  onLock,
}: Props) {
  const grouped = useMemo(() => {
    const groups = new Map<string, ConnectionView[]>();
    for (const c of connections) {
      const key = c.group ?? "Ungrouped";
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [connections]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand">s-term</span>
        <button className="icon-btn" title="Lock vault" onClick={onLock}>
          🔒
        </button>
      </div>

      <button className="primary block" onClick={onNewLocal}>
        + Local terminal
      </button>

      <div className="sidebar-section-title">
        <span>Connections</span>
        <div>
          <button className="icon-btn" title="Import connections" onClick={onImport}>
            ↧
          </button>
          <button
            className="icon-btn"
            title="Export connections"
            onClick={onExport}
          >
            ↥
          </button>
          <button className="icon-btn" title="Manage keys" onClick={onManageKeys}>
            🔑
          </button>
          <button
            className="icon-btn"
            title="New connection"
            onClick={onNewConnection}
          >
            +
          </button>
        </div>
      </div>

      <div className="connection-list">
        {connections.length === 0 && (
          <p className="muted">No connections yet. Add one with “+”.</p>
        )}
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className="connection-group">
            <div className="group-label">{groupName}</div>
            {items.map((c) => (
              <div key={c.id} className="connection-row">
                <button
                  className="connection-main"
                  onClick={() => onConnect(c)}
                  title={`${c.username}@${c.host}:${c.port}`}
                >
                  <span className="conn-name">{c.name}</span>
                  <span className="conn-sub">
                    {c.username}@{c.host}
                  </span>
                </button>
                <div className="connection-actions">
                  <button
                    className="icon-btn"
                    title="Edit"
                    onClick={() => onEditConnection(c)}
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn"
                    title="Delete"
                    onClick={() => onDeleteConnection(c)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

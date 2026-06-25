import { useMemo, useState, useEffect, useRef } from "react";
import Lock from "@mui/icons-material/Lock";
import Settings from "@mui/icons-material/Settings";
import Key from "@mui/icons-material/Key";
import FileDownload from "@mui/icons-material/FileDownload";
import FileUpload from "@mui/icons-material/FileUpload";
import Add from "@mui/icons-material/Add";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import { useTranslation } from "../i18n";
import type { ConnectionView } from "../types";

interface CollapsedState {
  [key: string]: boolean;
}

interface Props {
  connections: ConnectionView[];
  onConnect: (c: ConnectionView) => void;
  onNewLocal: (terminal?: string) => void;
  onNewConnection: () => void;
  onEditConnection: (c: ConnectionView) => void;
  onDeleteConnection: (c: ConnectionView) => void;
  onManageKeys: () => void;
  onExport: () => void;
  onImport: () => void;
  onLock: () => void;
  onOpenSettings: () => void;
  availableTerminals?: string[];
  defaultTerminal?: string;
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
  onOpenSettings,
  availableTerminals = [],
  defaultTerminal = "auto",
}: Props) {
  const { t } = useTranslation();
  const [disabledConnections, setDisabledConnections] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedState>({});
  const [showTerminalSelector, setShowTerminalSelector] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState(defaultTerminal);
  const terminalSelectorRef = useRef<HTMLDivElement>(null);

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

  const handleConnect = (c: ConnectionView) => {
    if (disabledConnections.has(c.id)) return;

    setDisabledConnections((prev) => new Set(prev).add(c.id));
    onConnect(c);

    setTimeout(() => {
      setDisabledConnections((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }, 1000);
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleNewLocal = (terminal?: string) => {
    setShowTerminalSelector(false);
    onNewLocal(terminal);
  };

  const handleTerminalSelect = (terminal: string) => {
    setSelectedTerminal(terminal);
    if (terminal === "auto") {
      handleNewLocal();
    } else {
      handleNewLocal(terminal);
    }
  };

  // Cerrar popup al hacer clic fuera
  useEffect(() => {
    if (!showTerminalSelector) return;
    const handler = (e: MouseEvent) => {
      if (terminalSelectorRef.current && !terminalSelectorRef.current.contains(e.target as Node)) {
        setShowTerminalSelector(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTerminalSelector]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand">s-term</span>
        <div>
          <button className="icon-btn" title={t("sidebar.settings")} onClick={onOpenSettings}>
            <Settings fontSize="small" />
          </button>
          <button className="icon-btn" title={t("sidebar.lock")} onClick={onLock}>
            <Lock fontSize="small" />
          </button>
        </div>
      </div>

      <div ref={terminalSelectorRef} style={{ display: "flex", gap: "4px", position: "relative" }}>
        <button className="primary" style={{ flex: 1 }} onClick={() => handleNewLocal()}>
          {t("sidebar.localTerminal")}
        </button>
        {availableTerminals.length > 1 && (
          <button
            className="primary"
            style={{ minWidth: "40px", padding: "0 12px" }}
            onClick={() => setShowTerminalSelector(!showTerminalSelector)}
          >
            <ArrowDropDown fontSize="small" />
          </button>
        )}
        {showTerminalSelector && availableTerminals.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--bg-alt)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              marginTop: "4px",
              zIndex: 10,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {availableTerminals.map((terminal) => (
              <button
                key={terminal}
                className="icon-btn"
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  display: "block",
                  background: selectedTerminal === terminal ? "var(--primary)" : "transparent",
                  color: selectedTerminal === terminal ? "var(--on-primary)" : "var(--text)",
                }}
                onClick={() => handleTerminalSelect(terminal)}
              >
                {terminal === "auto" ? t("auto.detect") : terminal}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section-title">
        <span>{t("sidebar.connections")}</span>
        <div>
          <button className="icon-btn" title={t("sidebar.import")} onClick={onImport}>
            <FileDownload fontSize="small" />
          </button>
          <button
            className="icon-btn"
            title={t("sidebar.export")}
            onClick={onExport}
          >
            <FileUpload fontSize="small" />
          </button>
          <button className="icon-btn" title={t("sidebar.manageKeys")} onClick={onManageKeys}>
            <Key fontSize="small" />
          </button>
          <button
            className="icon-btn"
            title={t("sidebar.newConnection")}
            onClick={onNewConnection}
          >
            <Add fontSize="small" />
          </button>
        </div>
      </div>

      <div className="connection-list">
        {connections.length === 0 && (
          <p className="muted">{t("sidebar.noConnections")}</p>
        )}
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className="connection-group">
            <button
              className="group-label label-caps"
              onClick={() => toggleGroup(groupName)}
            >
              <span className="group-chevron">
                {collapsedGroups[groupName] ? (
                  <ChevronRight fontSize="inherit" />
                ) : (
                  <ExpandMore fontSize="inherit" />
                )}
              </span>
              {groupName}
            </button>
            {!collapsedGroups[groupName] && items.map((c) => (
              <div key={c.id} className="connection-row">
                <button
                  className="connection-main"
                  onClick={() => handleConnect(c)}
                  disabled={disabledConnections.has(c.id)}
                  title={`${c.username}@${c.host}:${c.port}`}
                >
                  <span className="conn-name code-md">{c.name}</span>
                  <span className="conn-sub code-sm">
                    {c.username}@{c.host}
                  </span>
                </button>
                <div className="connection-actions">
                  <button
                    className="icon-btn"
                    title={t("sidebar.edit")}
                    onClick={() => onEditConnection(c)}
                  >
                    <Edit fontSize="small" />
                  </button>
                  <button
                    className="icon-btn"
                    title={t("sidebar.delete")}
                    onClick={() => onDeleteConnection(c)}
                  >
                    <Delete fontSize="small" />
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

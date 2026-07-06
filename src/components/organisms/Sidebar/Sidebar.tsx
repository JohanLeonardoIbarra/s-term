import { useEffect, useMemo, useState } from "react";
import Lock from "@mui/icons-material/Lock";
import Settings from "@mui/icons-material/Settings";
import Key from "@mui/icons-material/Key";
import FileUpload from "@mui/icons-material/FileUpload";
import Add from "@mui/icons-material/Add";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import IconButton from "../../atoms/IconButton";
import TerminalSelector from "../../molecules/TerminalSelector";
import ImportMenu from "../../molecules/ImportMenu";
import ConnectionRow from "../../molecules/ConnectionRow";
import { useTranslation } from "../../../i18n";
import type { ConnectionView, TerminalInfo } from "../../../types";
import styles from "./Sidebar.module.css";

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
  onImportBackup: () => void;
  onImportCsv: () => void;
  onLock: () => void;
  onOpenSettings: () => void;
  availableTerminals?: TerminalInfo[];
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
  onImportBackup,
  onImportCsv,
  onLock,
  onOpenSettings,
  availableTerminals = [],
  defaultTerminal = "auto",
}: Props) {
  const { t } = useTranslation();
  const [disabledConnections, setDisabledConnections] = useState<Set<string>>(
    new Set()
  );
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedState>(() => {
    try {
      const stored = localStorage.getItem("s-term-collapsed-groups");
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem("s-term-collapsed-groups", JSON.stringify(collapsedGroups));
    } catch {
      // ignore write errors
    }
  }, [collapsedGroups]);

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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.brand}>S-Term</span>
        <div>
          <IconButton title={t("sidebar.settings")} onClick={onOpenSettings}>
            <Settings fontSize="small" />
          </IconButton>
          <IconButton title={t("sidebar.lock")} onClick={onLock}>
            <Lock fontSize="small" />
          </IconButton>
        </div>
      </div>

      <TerminalSelector
        terminals={availableTerminals}
        selected={defaultTerminal}
        onNewLocal={() => onNewLocal()}
        onPick={(id) => onNewLocal(id === "auto" ? undefined : id)}
      />

      <div className={styles.sectionTitle}>
        <span>{t("sidebar.connections")}</span>
        <div>
          <ImportMenu onImportBackup={onImportBackup} onImportCsv={onImportCsv} />
          <IconButton title={t("sidebar.export")} onClick={onExport}>
            <FileUpload fontSize="small" />
          </IconButton>
          <IconButton title={t("sidebar.manageKeys")} onClick={onManageKeys}>
            <Key fontSize="small" />
          </IconButton>
          <IconButton title={t("sidebar.newConnection")} onClick={onNewConnection}>
            <Add fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className={styles.connectionList}>
        {connections.length === 0 && (
          <p className={styles.muted}>{t("sidebar.noConnections")}</p>
        )}
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className={styles.group}>
            <button
              className={`${styles.groupLabel} label-caps`}
              onClick={() => toggleGroup(groupName)}
            >
              <span className={styles.chevron}>
                {collapsedGroups[groupName] ? (
                  <ChevronRight fontSize="inherit" />
                ) : (
                  <ExpandMore fontSize="inherit" />
                )}
              </span>
              {groupName}
            </button>
            {!collapsedGroups[groupName] &&
              items.map((c) => (
                <ConnectionRow
                  key={c.id}
                  connection={c}
                  disabled={disabledConnections.has(c.id)}
                  onConnect={() => handleConnect(c)}
                  onEdit={() => onEditConnection(c)}
                  onDelete={() => onDeleteConnection(c)}
                />
              ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

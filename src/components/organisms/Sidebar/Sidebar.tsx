import { useEffect, useMemo, useState } from "react";
import Lock from "@mui/icons-material/Lock";
import Settings from "@mui/icons-material/Settings";
import Key from "@mui/icons-material/Key";
import FileUpload from "@mui/icons-material/FileUpload";
import Add from "@mui/icons-material/Add";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import DragIndicator from "@mui/icons-material/DragIndicator";
import IconButton from "../../atoms/IconButton";
import TerminalSelector from "../../molecules/TerminalSelector";
import ImportMenu from "../../molecules/ImportMenu";
import ConnectionRow from "../../molecules/ConnectionRow";
import DraggableList from "../../molecules/DraggableList";
import { useTranslation } from "../../../i18n";
import type { ConnectionView, TerminalInfo } from "../../../types";
import {
  loadSidebarOrder,
  saveSidebarOrder,
  normalizeSidebarOrder,
  type SidebarOrder,
} from "../../../sidebarOrder";
import styles from "./Sidebar.module.css";

interface GroupItemProps {
  name: string;
  groupConnections: ConnectionView[];
  collapsed: boolean | undefined;
  onToggle: () => void;
  onReorder: (from: number, to: number) => void;
  renderConnection: (c: ConnectionView, isDragging: boolean) => React.ReactNode;
}

function GroupItem({ name, groupConnections, collapsed, onToggle, onReorder, renderConnection }: GroupItemProps) {
  const { t } = useTranslation();
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftFifth = x < rect.width / 5;
    setIsHoveringLeft(isLeftFifth);
  };
  
  const handleMouseLeave = () => {
    setIsHoveringLeft(false);
  };
  
  const headerClasses = [styles.groupHeader, isHoveringLeft ? styles.handleVisible : ""].filter(Boolean).join(" ");
  
  return (
    <div className={styles.group}>
      <div 
        className={headerClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <span
          className={styles.groupHandle}
          data-drag-handle
          title={t("sidebar.dragToReorder")}
        >
          <DragIndicator fontSize="small" />
        </span>
        <button
          className={`${styles.groupLabel} label-caps`}
          onClick={onToggle}
        >
          <span className={styles.chevron}>
            {collapsed ? (
              <ChevronRight fontSize="inherit" />
            ) : (
              <ExpandMore fontSize="inherit" />
            )}
          </span>
          {name}
        </button>
      </div>
      {!collapsed && (
        <DraggableList
          items={groupConnections}
          listClassName={styles.groupConnections}
          renderItem={(c, _index, isGroupDragging) => renderConnection(c, isGroupDragging)}
          onReorder={onReorder}
        />
      )}
    </div>
  );
}

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
  const [sidebarOrder, setSidebarOrder] = useState<SidebarOrder>(() =>
    normalizeSidebarOrder(connections, loadSidebarOrder())
  );

  useEffect(() => {
    try {
      localStorage.setItem("s-term-collapsed-groups", JSON.stringify(collapsedGroups));
    } catch {
      // ignore write errors
    }
  }, [collapsedGroups]);

  useEffect(() => {
    setSidebarOrder((prev) => normalizeSidebarOrder(connections, prev));
  }, [connections]);

  const connectionById = useMemo(() => {
    const map = new Map<string, ConnectionView>();
    for (const c of connections) map.set(c.id, c);
    return map;
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

  const handleReorderTopLevel = (fromIndex: number, toIndex: number) => {
    setSidebarOrder((prev) => {
      const topLevel = [...prev.topLevel];
      const [moved] = topLevel.splice(fromIndex, 1);
      topLevel.splice(toIndex, 0, moved);
      const next = { ...prev, topLevel };
      saveSidebarOrder(next);
      return next;
    });
  };

  const handleReorderGroup = (groupName: string, fromIndex: number, toIndex: number) => {
    setSidebarOrder((prev) => {
      const items = [...(prev.groupItems[groupName] ?? [])];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      const next = { ...prev, groupItems: { ...prev.groupItems, [groupName]: items } };
      saveSidebarOrder(next);
      return next;
    });
  };

  const renderConnection = (c: ConnectionView, isDragging: boolean) => (
    <ConnectionRow
      key={c.id}
      className={isDragging ? styles.dragging : ""}
      connection={c}
      disabled={disabledConnections.has(c.id)}
      onConnect={() => handleConnect(c)}
      onEdit={() => onEditConnection(c)}
      onDelete={() => onDeleteConnection(c)}
    />
  );

  const renderTopLevelItem = (item: SidebarOrder["topLevel"][number], _index: number, isDragging: boolean) => {
    if (item.type === "connection") {
      const c = connectionById.get(item.id);
      if (!c) return null;
      return renderConnection(c, isDragging);
    }

    const name = item.name;
    const groupIds = sidebarOrder.groupItems[name] ?? [];
    const groupConnections = groupIds
      .map((id) => connectionById.get(id))
      .filter((c): c is ConnectionView => c != null);

    return (
      <GroupItem
        key={name}
        name={name}
        groupConnections={groupConnections}
        collapsed={collapsedGroups[name]}
        onToggle={() => toggleGroup(name)}
        onReorder={(from, to) => handleReorderGroup(name, from, to)}
        renderConnection={renderConnection}
      />
    );
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

      {connections.length === 0 ? (
        <div className={styles.connectionList}>
          <p className={styles.muted}>{t("sidebar.noConnections")}</p>
        </div>
      ) : (
        <DraggableList
          items={sidebarOrder.topLevel}
          className={styles.connectionList}
          listClassName={styles.connectionListInner}
          renderItem={renderTopLevelItem}
          onReorder={handleReorderTopLevel}
        />
      )}
    </aside>
  );
}

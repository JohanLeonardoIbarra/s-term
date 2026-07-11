import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DroppableProvided,
} from "@hello-pangea/dnd";
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
  provided: DraggableProvided;
  renderConnection: (c: ConnectionView, index: number, provided?: DraggableProvided) => React.ReactNode;
}

function GroupItem({ name, groupConnections, collapsed, onToggle, provided, renderConnection }: GroupItemProps) {
  const { t } = useTranslation();
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftFifth = x < rect.width / 15;
    setIsHoveringLeft(isLeftFifth);
  };
  
  const handleMouseLeave = () => {
    setIsHoveringLeft(false);
  };
  
  const headerClasses = [styles.groupHeader, isHoveringLeft ? styles.handleVisible : ""].filter(Boolean).join(" ");
  
  return (
    <div className={styles.group} ref={provided.innerRef} {...provided.draggableProps}>
      <div 
        className={headerClasses}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <span
          className={styles.groupHandle}
          data-drag-handle
          title={t("sidebar.dragToReorder")}
          {...provided.dragHandleProps}
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
        <Droppable droppableId={`group-${name}`} type="GROUP">
          {(droppableProvided: DroppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className={styles.groupConnections}
            >
              {groupConnections.map((c, index) => (
                <Draggable key={`conn-${c.id}`} draggableId={`conn-${c.id}`} index={index}>
                  {(connProvided) => renderConnection(c, index, connProvided)}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
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
  onConnectionGroupChange?: (id: string, group: string | null) => Promise<void>;
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
  onConnectionGroupChange,
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

  const renderConnection = (c: ConnectionView, _index: number, provided?: DraggableProvided) => (
    <ConnectionRow
      key={c.id}
      provided={provided}
      connection={c}
      disabled={disabledConnections.has(c.id)}
      onConnect={() => handleConnect(c)}
      onEdit={() => onEditConnection(c)}
      onDelete={() => onDeleteConnection(c)}
    />
  );

  const renderTopLevelConnection = (item: SidebarOrder["topLevel"][number], index: number) => {
    if (item.type !== "connection") return null;
    const c = connectionById.get(item.id);
    if (!c) return null;
    return (
      <Draggable key={`conn-top-${c.id}`} draggableId={`conn-top-${c.id}`} index={index}>
        {(provided) => renderConnection(c, index, provided)}
      </Draggable>
    );
  };

  const renderTopLevelGroup = (item: SidebarOrder["topLevel"][number], index: number) => {
    if (item.type !== "group") return null;
    const name = item.name;
    const groupIds = sidebarOrder.groupItems[name] ?? [];
    const groupConnections = groupIds
      .map((id) => connectionById.get(id))
      .filter((c): c is ConnectionView => c != null);

    return (
      <Draggable key={`group-${name}`} draggableId={`group-${name}`} index={index}>
        {(provided) => (
          <GroupItem
            name={name}
            groupConnections={groupConnections}
            collapsed={collapsedGroups[name]}
            onToggle={() => toggleGroup(name)}
            provided={provided}
            renderConnection={renderConnection}
          />
        )}
      </Draggable>
    );
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceIsTopLevel = source.droppableId === "top-level";
    const destIsTopLevel = destination.droppableId === "top-level";
    const sourceGroupId = sourceIsTopLevel ? null : source.droppableId.replace("group-", "");
    const destGroupId = destIsTopLevel ? null : destination.droppableId.replace("group-", "");

    // Reorder within top-level
    if (sourceIsTopLevel && destIsTopLevel) {
      setSidebarOrder((prev) => {
        const topLevel = [...prev.topLevel];
        const [moved] = topLevel.splice(source.index, 1);
        topLevel.splice(destination.index, 0, moved);
        const next = { ...prev, topLevel };
        saveSidebarOrder(next);
        return next;
      });
      return;
    }

    // Reorder within the same group
    if (sourceGroupId && destGroupId && sourceGroupId === destGroupId) {
      setSidebarOrder((prev) => {
        const items = [...(prev.groupItems[sourceGroupId] ?? [])];
        const [moved] = items.splice(source.index, 1);
        items.splice(destination.index, 0, moved);
        const next = { ...prev, groupItems: { ...prev.groupItems, [sourceGroupId]: items } };
        saveSidebarOrder(next);
        return next;
      });
      return;
    }

    // Moving connection between containers
    const connId = draggableId.startsWith("conn-top-")
      ? draggableId.replace("conn-top-", "")
      : draggableId.replace("conn-", "");
    const newGroup = destIsTopLevel ? null : destGroupId;

    if (onConnectionGroupChange) {
      try {
        await onConnectionGroupChange(connId, newGroup);
      } catch {
        return;
      }
    }

    setSidebarOrder((prev) => {
      const next = {
        ...prev,
        topLevel: [...prev.topLevel],
        groupItems: { ...prev.groupItems },
      };

      if (sourceIsTopLevel) {
        const [moved] = next.topLevel.splice(source.index, 1);
        if (destIsTopLevel) {
          next.topLevel.splice(destination.index, 0, moved);
        } else {
          if (!next.groupItems[destGroupId!]) {
            next.groupItems[destGroupId!] = [];
          }
          next.groupItems[destGroupId!].splice(destination.index, 0, connId);
        }
      } else {
        const sourceItems = [...(next.groupItems[sourceGroupId!] ?? [])];
        const [movedId] = sourceItems.splice(source.index, 1);
        next.groupItems[sourceGroupId!] = sourceItems;

        if (destIsTopLevel) {
          next.topLevel.splice(destination.index, 0, { type: "connection", id: movedId });
        } else {
          if (!next.groupItems[destGroupId!]) {
            next.groupItems[destGroupId!] = [];
          }
          next.groupItems[destGroupId!].splice(destination.index, 0, movedId);
        }
      }

      saveSidebarOrder(next);
      return next;
    });
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="top-level" type="TOP_LEVEL">
            {(droppableProvided: DroppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className={`${styles.connectionList} ${styles.connectionListInner}`}
              >
                {sidebarOrder.topLevel.map((item, index) => {
                  if (item.type === "connection") {
                    return renderTopLevelConnection(item, index);
                  }
                  return renderTopLevelGroup(item, index);
                })}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </aside>
  );
}

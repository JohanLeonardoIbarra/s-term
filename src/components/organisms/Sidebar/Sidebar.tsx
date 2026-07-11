import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
} from "@hello-pangea/dnd";
import Lock from "@mui/icons-material/Lock";
import Settings from "@mui/icons-material/Settings";
import Key from "@mui/icons-material/Key";
import FileUpload from "@mui/icons-material/FileUpload";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import IconButton from "../../atoms/IconButton";
import TerminalSelector from "../../molecules/TerminalSelector";
import ImportMenu from "../../molecules/ImportMenu";
import ConnectionRow from "../../molecules/ConnectionRow";
import GroupEditor from "../../organisms/GroupEditor";
import { useTranslation } from "../../../i18n";
import type { ConnectionView, SidebarOrder, TerminalInfo } from "../../../types";
import { normalizeSidebarOrder } from "../../../sidebarOrder";
import { loadSidebarState, saveSidebarState } from "../../../api";
import styles from "./Sidebar.module.css";

interface GroupItemProps {
  name: string;
  groupConnections: ConnectionView[];
  collapsed: boolean | undefined;
  onToggle: () => void;
  onEdit: () => void;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  renderConnection: (c: ConnectionView, index: number, provided?: DraggableProvided, snapshot?: DraggableStateSnapshot) => React.ReactNode;
}

function GroupItem({ name, groupConnections, collapsed, onToggle, onEdit, provided, snapshot, renderConnection }: GroupItemProps) {
  const { t } = useTranslation();
  return (
    <div
      className={styles.group}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        cursor: snapshot.isDragging ? "grabbing" : "default",
      }}
    >
      <div className={styles.groupHeader}>
        <div
          className={`${styles.groupLabel} label-caps`}
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <span className={styles.chevron}>
            {collapsed ? (
              <ChevronRight fontSize="inherit" />
            ) : (
              <ExpandMore fontSize="inherit" />
            )}
          </span>
          {name}
        </div>
        <span onPointerDown={(e) => e.stopPropagation()} className={styles.groupEditWrap}>
          <IconButton title={t("sidebar.edit")} onClick={onEdit}>
            <Edit fontSize="small" />
          </IconButton>
        </span>
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
                  {(connProvided, connSnapshot) => renderConnection(c, index, connProvided, connSnapshot)}
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
  onEditGroup?: (oldName: string, newName: string) => Promise<void>;
  onDeleteGroup?: (groupName: string) => Promise<void>;
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
  onEditGroup,
  onDeleteGroup,
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
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedState>({});
  const [sidebarOrder, setSidebarOrder] = useState<SidebarOrder>(() =>
    normalizeSidebarOrder(connections, null)
  );
  const [groupTransferLocks, setGroupTransferLocks] = useState<Record<string, boolean>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSidebarState()
      .then((state) => {
        if (cancelled) return;
        setSidebarOrder((prev) =>
          normalizeSidebarOrder(connections, state.order ?? prev)
        );
        setCollapsedGroups(state.collapsedGroups ?? {});
        setGroupTransferLocks(state.transferLocks ?? {});
        setLoaded(true);
      })
      .catch(() => {
        // ignore errors and leave default state
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [connections]);

  useEffect(() => {
    if (!loaded) return;
    void saveSidebarState({
      order: sidebarOrder,
      collapsedGroups,
      transferLocks: groupTransferLocks,
    });
  }, [sidebarOrder, collapsedGroups, groupTransferLocks, loaded]);

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

  const handleEditGroup = async (oldName: string, newName: string, blockTransfer: boolean) => {
    if (onEditGroup) {
      await onEditGroup(oldName, newName);
    }
    setGroupTransferLocks((prev) => {
      const next = { ...prev };
      delete next[oldName];
      next[newName] = blockTransfer;
      return next;
    });
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupName: string) => {
    if (onDeleteGroup) {
      await onDeleteGroup(groupName);
    }
    setGroupTransferLocks((prev) => {
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
    setEditingGroup(null);
  };

  const renderConnection = (c: ConnectionView, _index: number, provided?: DraggableProvided, snapshot?: DraggableStateSnapshot) => (
    <ConnectionRow
      key={c.id}
      provided={provided}
      snapshot={snapshot}
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
        {(provided, snapshot) => (
          <GroupItem
            name={name}
            groupConnections={groupConnections}
            collapsed={collapsedGroups[name]}
            onToggle={() => toggleGroup(name)}
            onEdit={() => setEditingGroup(name)}
            provided={provided}
            snapshot={snapshot}
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

    // Block transfer if source or destination group is locked
    if (!sourceIsTopLevel && groupTransferLocks[sourceGroupId!]) return;
    if (!destIsTopLevel && groupTransferLocks[destGroupId!]) return;

    // Reorder within top-level
    if (sourceIsTopLevel && destIsTopLevel) {
      setSidebarOrder((prev) => {
        const topLevel = [...prev.topLevel];
        const [moved] = topLevel.splice(source.index, 1);
        topLevel.splice(destination.index, 0, moved);
        const next = { ...prev, topLevel };
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

      {editingGroup && (
        <GroupEditor
          groupName={editingGroup}
          existingGroups={sidebarOrder.topLevel
            .filter((item): item is { type: "group"; name: string } => item.type === "group")
            .map((item) => item.name)}
          blockTransfer={!!groupTransferLocks[editingGroup]}
          onSave={(newName, blockTransfer) => {
            if (newName !== editingGroup && onEditGroup) {
              void handleEditGroup(editingGroup, newName, blockTransfer);
            } else {
              setGroupTransferLocks((prev) => ({ ...prev, [editingGroup]: blockTransfer }));
              setEditingGroup(null);
            }
          }}
          onDelete={() => void handleDeleteGroup(editingGroup)}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </aside>
  );
}

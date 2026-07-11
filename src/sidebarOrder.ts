import type { ConnectionView, SidebarItem, SidebarOrder } from "./types";

function getGroup(connection: ConnectionView): string | null {
  const group = connection.group;
  if (group == null || group === "") return null;
  return group;
}

export function normalizeSidebarOrder(
  connections: ConnectionView[],
  order: SidebarOrder | null | undefined
): SidebarOrder {
  const validOrder = order && Array.isArray(order.topLevel) ? order : null;
  const connectionById = new Map<string, ConnectionView>();
  const groups = new Set<string>();
  const ungroupedIds: string[] = [];
  const groupMembers = new Map<string, string[]>();

  for (const c of connections) {
    connectionById.set(c.id, c);
    const group = getGroup(c);
    if (group == null) {
      ungroupedIds.push(c.id);
    } else {
      groups.add(group);
      const arr = groupMembers.get(group) ?? [];
      arr.push(c.id);
      groupMembers.set(group, arr);
    }
  }

  const groupNames = Array.from(groups).sort((a, b) => a.localeCompare(b));

  if (!validOrder) {
    const topLevel: SidebarItem[] = [
      ...ungroupedIds.map((id) => ({ type: "connection" as const, id })),
      ...groupNames.map((name) => ({ type: "group" as const, name })),
    ];
    const groupItems: Record<string, string[]> = {};
    for (const name of groupNames) {
      groupItems[name] = groupMembers.get(name) ?? [];
    }
    return { topLevel, groupItems };
  }

  const topLevel: SidebarItem[] = [];
  const seenTopLevel = new Set<string>();

  for (const item of validOrder.topLevel) {
    if (item.type === "connection") {
      const c = connectionById.get(item.id);
      if (c && getGroup(c) == null && !seenTopLevel.has(item.id)) {
        topLevel.push(item);
        seenTopLevel.add(item.id);
      }
    } else {
      if (groups.has(item.name) && !seenTopLevel.has(item.name)) {
        topLevel.push(item);
        seenTopLevel.add(item.name);
      }
    }
  }

  // Append missing ungrouped connections at the end in the order they arrive.
  for (const id of ungroupedIds) {
    if (!seenTopLevel.has(id)) {
      topLevel.push({ type: "connection", id });
      seenTopLevel.add(id);
    }
  }

  // Append missing groups in alphabetical order.
  for (const name of groupNames) {
    if (!seenTopLevel.has(name)) {
      topLevel.push({ type: "group", name });
      seenTopLevel.add(name);
    }
  }

  const groupItems: Record<string, string[]> = {};
  const seenInGroup = new Map<string, Set<string>>();

  for (const name of groupNames) {
    const ids: string[] = [];
    const seen = new Set<string>();
    const saved = validOrder.groupItems[name] ?? [];
    for (const id of saved) {
      const c = connectionById.get(id);
      if (c && getGroup(c) === name && !seen.has(id)) {
        ids.push(id);
        seen.add(id);
      }
    }
    for (const id of groupMembers.get(name) ?? []) {
      if (!seen.has(id)) {
        ids.push(id);
        seen.add(id);
      }
    }
    groupItems[name] = ids;
    seenInGroup.set(name, seen);
  }

  return { topLevel, groupItems };
}

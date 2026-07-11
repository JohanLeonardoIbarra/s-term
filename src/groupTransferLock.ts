const STORAGE_KEY = "s-term-group-transfer-locks";

export interface GroupTransferLocks {
  [groupName: string]: boolean;
}

export function loadGroupTransferLocks(): GroupTransferLocks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GroupTransferLocks;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

export function saveGroupTransferLocks(locks: GroupTransferLocks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
  } catch {
    // ignore write errors
  }
}

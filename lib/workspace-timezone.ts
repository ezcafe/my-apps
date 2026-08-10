/** Browser IANA timezone for workspace analytics bucketing. */
export function browserTimezoneName(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export const MONEY_TZ_SYNC_STORAGE_PREFIX = "money.tz-synced:";

export type TimezoneSyncStorage = Pick<Storage, "getItem" | "setItem">;

export function timezoneSyncStorageKey(workspaceId: string): string {
  return `${MONEY_TZ_SYNC_STORAGE_PREFIX}${workspaceId}`;
}

function sessionStorageOrNull(): TimezoneSyncStorage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Skip a timezone PATCH when this tab already synced the same IANA zone. */
export function readCachedSyncedTimezone(
  workspaceId: string,
  storage: TimezoneSyncStorage | null = sessionStorageOrNull(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(timezoneSyncStorageKey(workspaceId));
  } catch {
    return null;
  }
}

export function writeCachedSyncedTimezone(
  workspaceId: string,
  tzName: string,
  storage: TimezoneSyncStorage | null = sessionStorageOrNull(),
): void {
  if (!storage) return;
  try {
    storage.setItem(timezoneSyncStorageKey(workspaceId), tzName);
  } catch {
    // Private mode / quota — next load may PATCH again.
  }
}

export async function syncWorkspaceTimezone(
  workspaceId: string,
  tzName: string,
): Promise<{ unchanged: boolean }> {
  const res = await fetch("/api/workspace/timezone", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, tzName }),
  });
  if (!res.ok) {
    throw new Error(`Timezone sync failed (${res.status})`);
  }
  const json = (await res.json()) as {
    data?: { unchanged?: boolean };
  };
  return { unchanged: json.data?.unchanged ?? false };
}

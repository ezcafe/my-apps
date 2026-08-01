/** Browser IANA timezone for workspace analytics bucketing. */
export function browserTimezoneName(): string | null {
  if (typeof Intl === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
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

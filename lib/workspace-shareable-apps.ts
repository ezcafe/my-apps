import {
  WORKSPACE_APP_KEYS,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";

/** Apps that may appear in per-member grants this product pass. */
export const SHAREABLE_WORKSPACE_APP_KEYS = ["money", "baby"] as const satisfies readonly WorkspaceAppKey[];

export type ShareableWorkspaceAppKey =
  (typeof SHAREABLE_WORKSPACE_APP_KEYS)[number];

export function isShareableWorkspaceAppKey(
  raw: string,
): raw is ShareableWorkspaceAppKey {
  return (SHAREABLE_WORKSPACE_APP_KEYS as readonly string[]).includes(raw);
}

/**
 * Validate and dedupe a client app list. Throws Error with a clear message.
 * Rejects empty lists and any non-shareable key (including other WORKSPACE_APP_KEYS).
 */
export function parseShareableWorkspaceAppKeys(
  raw: unknown,
): ShareableWorkspaceAppKey[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Select at least one shareable app");
  }
  const out: ShareableWorkspaceAppKey[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !isShareableWorkspaceAppKey(item)) {
      throw new Error("Only shareable apps are allowed (money, baby)");
    }
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  if (out.length === 0) {
    throw new Error("Select at least one shareable app");
  }
  // Stable order matching SHAREABLE_WORKSPACE_APP_KEYS
  return SHAREABLE_WORKSPACE_APP_KEYS.filter((k) => seen.has(k));
}

/** Sanity: shareable set is a subset of registered keys. */
export function assertShareableSubsetOfWorkspaceKeys(): void {
  for (const k of SHAREABLE_WORKSPACE_APP_KEYS) {
    if (!(WORKSPACE_APP_KEYS as readonly string[]).includes(k)) {
      throw new Error(`Shareable app ${k} is not in WORKSPACE_APP_KEYS`);
    }
  }
}

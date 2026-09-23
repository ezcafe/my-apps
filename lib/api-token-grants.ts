/**
 * Shareable app grants on personal API tokens (Money + Baby).
 * Prefix stays `mny_` for Settings-created tokens; `apps` is the access list.
 */

import {
  parseShareableWorkspaceAppKeys,
  SHAREABLE_WORKSPACE_APP_KEYS,
  type ShareableWorkspaceAppKey,
} from "@/lib/workspace-shareable-apps";

export type ApiTokenAppsRow = {
  appKey: string;
  apps?: ShareableWorkspaceAppKey[] | string[] | null;
};

/** Stable grants for GraphQL gates. Empty = no Money/Baby via this token. */
export function resolveTokenApps(
  row: ApiTokenAppsRow,
): ShareableWorkspaceAppKey[] {
  if (Array.isArray(row.apps) && row.apps.length > 0) {
    try {
      return parseShareableWorkspaceAppKeys(row.apps);
    } catch {
      // Ignore corrupt jsonb; fall through to app_key.
    }
  }
  if (row.appKey === "money" || row.appKey === "baby") {
    return [row.appKey];
  }
  return [];
}

export function apiTokenHasAppGrant(
  apps: readonly string[],
  app: ShareableWorkspaceAppKey,
): boolean {
  return apps.includes(app);
}

/**
 * DB `app_key` + secret prefix for Settings shareable tokens.
 * Always `money` so `mny_` lookup keeps working (Decision 4).
 */
export function primaryAppKeyForTokenApps(
  _apps: readonly ShareableWorkspaceAppKey[],
): "money" {
  return "money";
}

export function normalizeTokenAppsInput(
  raw: unknown,
  legacyAppKey?: string,
): ShareableWorkspaceAppKey[] {
  if (raw !== undefined && raw !== null) {
    return parseShareableWorkspaceAppKeys(raw);
  }
  if (legacyAppKey === "money" || legacyAppKey === "baby") {
    return [legacyAppKey];
  }
  if (legacyAppKey == null || legacyAppKey === "") {
    return [...SHAREABLE_WORKSPACE_APP_KEYS].slice(0, 1); // money default
  }
  throw new Error("Select at least one shareable app (money, baby)");
}

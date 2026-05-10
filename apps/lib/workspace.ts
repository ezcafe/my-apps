/**
 * Money-focused wrappers around workspace-context (appKey `"money"`).
 * Prefer importing from `@/lib/workspace-context` for new code.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  assertWorkspaceMember,
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const MONEY_APP: WorkspaceAppKey = "money";

export async function getWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, MONEY_APP);
}

export async function getWorkspaceDefaultCurrency(
  workspaceId: string,
): Promise<string | null> {
  const rows = await db
    .select({ defaultCurrency: workspace.defaultCurrency })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  return rows[0]?.defaultCurrency ?? null;
}

export { assertWorkspaceMember, workspaceCookieName };

/** Cookie name for active Money workspace */
export const WORKSPACE_COOKIE = workspaceCookieName(MONEY_APP);

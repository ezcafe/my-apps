/**
 * Money-focused wrappers around workspace-context (appKey `"money"`).
 * Prefer importing from `@/lib/workspace-context` for new code.
 */
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

export { assertWorkspaceMember, workspaceCookieName };

/** Cookie name for active Money workspace */
export const WORKSPACE_COOKIE = workspaceCookieName(MONEY_APP);

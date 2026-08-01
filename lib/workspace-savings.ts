import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const SAVINGS_APP: WorkspaceAppKey = "money";

export async function getSavingsWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, SAVINGS_APP);
}

export const SAVINGS_WORKSPACE_COOKIE = workspaceCookieName(SAVINGS_APP);

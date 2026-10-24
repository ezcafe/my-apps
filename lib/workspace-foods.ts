import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  assertWorkspaceMember,
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const FOODS_APP: WorkspaceAppKey = "foods";

export async function getFoodsWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, FOODS_APP);
}

export { assertWorkspaceMember, workspaceCookieName };

export const FOODS_WORKSPACE_COOKIE = workspaceCookieName(FOODS_APP);
export const FOODS_APP_KEY = FOODS_APP;

import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  assertWorkspaceMember,
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const BABY_APP: WorkspaceAppKey = "baby";

export async function getBabyWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, BABY_APP);
}

export { assertWorkspaceMember, workspaceCookieName };

export const BABY_WORKSPACE_COOKIE = workspaceCookieName(BABY_APP);
export const BABY_APP_KEY = BABY_APP;

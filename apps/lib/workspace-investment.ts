import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const INVESTMENT_APP: WorkspaceAppKey = "investment";

export async function getInvestmentWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, INVESTMENT_APP);
}

export const INVESTMENT_WORKSPACE_COOKIE = workspaceCookieName(INVESTMENT_APP);

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import type { WorkspaceAppKey } from "@/db/schema/workspace";
import {
  assertWorkspaceMember,
  getActiveWorkspaceId,
  workspaceCookieName,
} from "@/lib/workspace-context";

const LOANS_APP: WorkspaceAppKey = "money";

export async function getLoansWorkspaceIdForUser(
  userSub: string,
): Promise<string | null> {
  return getActiveWorkspaceId(userSub, LOANS_APP);
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

export const LOANS_WORKSPACE_COOKIE = workspaceCookieName(LOANS_APP);

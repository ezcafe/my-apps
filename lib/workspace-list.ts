import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";

export type BootstrapWorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

/** Same rows as GET /api/workspace/list?app=* */
export async function fetchWorkspacesForUser(
  userSub: string,
  appKey: WorkspaceAppKey,
): Promise<{
  workspaces: BootstrapWorkspaceRow[];
  defaultWorkspaceId: string | null;
}> {
  const [rows, prefRow] = await Promise.all([
    db
      .select({
        id: workspace.id,
        name: workspace.name,
        kind: workspace.kind,
        ownedByUserSub: workspace.ownedByUserSub,
        defaultCurrency: workspace.defaultCurrency,
        role: workspaceMember.role,
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
      .where(eq(workspaceMember.userSub, userSub)),
    db
      .select({ defaultWorkspaceId: userWorkspaceDefault.defaultWorkspaceId })
      .from(userWorkspaceDefault)
      .where(
        and(
          eq(userWorkspaceDefault.userSub, userSub),
          eq(userWorkspaceDefault.appKey, appKey),
        ),
      )
      .limit(1),
  ]);

  const defaultWorkspaceId = prefRow[0]?.defaultWorkspaceId ?? null;
  const workspaces = rows.map((r) => ({
    ...r,
    isDefault: r.id === defaultWorkspaceId,
  }));
  return { workspaces, defaultWorkspaceId };
}

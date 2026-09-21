import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
  workspaceMemberApp,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";
import { evaluateWorkspaceAppAccess } from "@/lib/workspace-app-access";
import { isShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";

export type BootstrapWorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "shared";
  ownedByUserSub: string | null;
  defaultCurrency: string | null;
  role: "owner" | "member";
  isDefault: boolean;
};

/** Same rows as GET /api/workspace/list?app=* — filtered by app grants for shareable apps. */
export async function fetchWorkspacesForUser(
  userSub: string,
  appKey: WorkspaceAppKey,
): Promise<{
  workspaces: BootstrapWorkspaceRow[];
  defaultWorkspaceId: string | null;
}> {
  const [rows, prefRow, grantRows] = await Promise.all([
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
    isShareableWorkspaceAppKey(appKey)
      ? db
          .select({
            workspaceId: workspaceMemberApp.workspaceId,
          })
          .from(workspaceMemberApp)
          .where(
            and(
              eq(workspaceMemberApp.userSub, userSub),
              eq(workspaceMemberApp.appKey, appKey),
            ),
          )
      : Promise.resolve([] as { workspaceId: string }[]),
  ]);

  const grantedIds = new Set(grantRows.map((g) => g.workspaceId));
  const visible = rows.filter((r) =>
    evaluateWorkspaceAppAccess({
      role: r.role,
      workspaceKind: r.kind,
      appKey,
      hasAppGrant: grantedIds.has(r.id),
    }),
  );

  const defaultWorkspaceId = prefRow[0]?.defaultWorkspaceId ?? null;
  const workspaces = visible.map((r) => ({
    ...r,
    isDefault: r.id === defaultWorkspaceId,
  }));
  return { workspaces, defaultWorkspaceId };
}

/** Replace grant rows for a member (scalar multi-row insert). */
export async function replaceMemberAppGrants(
  workspaceId: string,
  userSub: string,
  apps: readonly string[],
): Promise<void> {
  await db
    .delete(workspaceMemberApp)
    .where(
      and(
        eq(workspaceMemberApp.workspaceId, workspaceId),
        eq(workspaceMemberApp.userSub, userSub),
      ),
    );
  if (apps.length === 0) return;
  await db.insert(workspaceMemberApp).values(
    apps.map((appKey) => ({
      workspaceId,
      userSub,
      appKey,
    })),
  );
}

export async function listMemberAppGrants(
  workspaceId: string,
  userSubs: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userSubs.length === 0) return map;
  const rows = await db
    .select({
      userSub: workspaceMemberApp.userSub,
      appKey: workspaceMemberApp.appKey,
    })
    .from(workspaceMemberApp)
    .where(
      and(
        eq(workspaceMemberApp.workspaceId, workspaceId),
        inArray(workspaceMemberApp.userSub, userSubs),
      ),
    );
  for (const row of rows) {
    const list = map.get(row.userSub) ?? [];
    list.push(row.appKey);
    map.set(row.userSub, list);
  }
  return map;
}

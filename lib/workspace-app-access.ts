import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  userDirectory,
  workspace,
  workspaceMember,
  workspaceMemberApp,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";
import { isShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";

export function normalizeUserEmail(
  email: string | null | undefined,
): string | null {
  if (email == null) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/** Pure access matrix — unit-tested; DB helper uses the same rules. */
export function evaluateWorkspaceAppAccess(args: {
  role: "owner" | "member" | null;
  workspaceKind: "personal" | "shared";
  appKey: WorkspaceAppKey;
  hasAppGrant: boolean;
}): boolean {
  if (!args.role) return false;
  if (args.role === "owner") return true;
  if (args.workspaceKind === "personal") return true;
  if (!isShareableWorkspaceAppKey(args.appKey)) return true;
  return args.hasAppGrant;
}

export async function upsertUserDirectory(
  userSub: string,
  email: string | null | undefined,
): Promise<void> {
  const emailNormalized = normalizeUserEmail(email);
  if (!emailNormalized) return;
  await db
    .insert(userDirectory)
    .values({
      userSub,
      emailNormalized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userDirectory.userSub,
      set: {
        emailNormalized,
        updatedAt: new Date(),
      },
    });
}

export async function findUserSubByEmail(
  email: string,
): Promise<string | null> {
  const emailNormalized = normalizeUserEmail(email);
  if (!emailNormalized) return null;
  const rows = await db
    .select({ userSub: userDirectory.userSub })
    .from(userDirectory)
    .where(eq(userDirectory.emailNormalized, emailNormalized))
    .limit(1);
  return rows[0]?.userSub ?? null;
}

export async function assertWorkspaceAppAccess(
  userSub: string,
  workspaceId: string,
  appKey: WorkspaceAppKey,
): Promise<boolean> {
  const rows = await db
    .select({
      role: workspaceMember.role,
      kind: workspace.kind,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return false;

  let hasAppGrant = false;
  if (
    row.role === "member" &&
    row.kind === "shared" &&
    isShareableWorkspaceAppKey(appKey)
  ) {
    const grant = await db
      .select({ appKey: workspaceMemberApp.appKey })
      .from(workspaceMemberApp)
      .where(
        and(
          eq(workspaceMemberApp.workspaceId, workspaceId),
          eq(workspaceMemberApp.userSub, userSub),
          eq(workspaceMemberApp.appKey, appKey),
        ),
      )
      .limit(1);
    hasAppGrant = grant.length > 0;
  }

  return evaluateWorkspaceAppAccess({
    role: row.role,
    workspaceKind: row.kind,
    appKey,
    hasAppGrant,
  });
}

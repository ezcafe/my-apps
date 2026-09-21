import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  userDirectory,
  workspace,
  workspaceMember,
  workspaceMemberApp,
} from "@/db/schema/workspace";
import { findUserSubByEmail } from "@/lib/workspace-app-access";
import { assertWorkspaceOwner, getMemberRole } from "@/lib/workspace-context";
import {
  listMemberAppGrants,
  replaceMemberAppGrants,
} from "@/lib/workspace-list";
import {
  parseShareableWorkspaceAppKeys,
  SHAREABLE_WORKSPACE_APP_KEYS,
  type ShareableWorkspaceAppKey,
} from "@/lib/workspace-shareable-apps";

export type WorkspaceMemberRow = {
  userSub: string;
  email: string | null;
  role: "owner" | "member";
  apps: ShareableWorkspaceAppKey[];
};

export async function listWorkspaceMembersForOwner(
  ownerSub: string,
  workspaceId: string,
): Promise<WorkspaceMemberRow[] | { error: "forbidden" | "not_found" }> {
  const role = await getMemberRole(ownerSub, workspaceId);
  if (role !== "owner") return { error: "forbidden" };

  const ws = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  if (!ws[0]) return { error: "not_found" };

  const members = await db
    .select({
      userSub: workspaceMember.userSub,
      role: workspaceMember.role,
    })
    .from(workspaceMember)
    .where(eq(workspaceMember.workspaceId, workspaceId));

  const userSubs = members.map((m) => m.userSub);
  const grants = await listMemberAppGrants(workspaceId, userSubs);

  const emailBySub = new Map<string, string>();
  if (userSubs.length > 0) {
    const emailRows = await db
      .select({
        userSub: userDirectory.userSub,
        emailNormalized: userDirectory.emailNormalized,
      })
      .from(userDirectory)
      .where(inArray(userDirectory.userSub, userSubs));
    for (const row of emailRows) {
      emailBySub.set(row.userSub, row.emailNormalized);
    }
  }

  return members.map((m) => {
    const apps: ShareableWorkspaceAppKey[] =
      m.role === "owner"
        ? [...SHAREABLE_WORKSPACE_APP_KEYS]
        : ((grants.get(m.userSub) ?? []).filter((a) =>
            (SHAREABLE_WORKSPACE_APP_KEYS as readonly string[]).includes(a),
          ) as ShareableWorkspaceAppKey[]);
    return {
      userSub: m.userSub,
      email: emailBySub.get(m.userSub) ?? null,
      role: m.role,
      apps,
    };
  });
}

export async function addWorkspaceMember(args: {
  ownerSub: string;
  workspaceId: string;
  email: string;
  apps: unknown;
}): Promise<
  | { data: WorkspaceMemberRow }
  | {
      error:
        | "forbidden"
        | "not_found"
        | "user_not_found"
        | "conflict"
        | "bad_request"
        | "not_shared";
      message: string;
    }
> {
  let apps: ShareableWorkspaceAppKey[];
  try {
    apps = parseShareableWorkspaceAppKeys(args.apps);
  } catch (e) {
    return {
      error: "bad_request",
      message: e instanceof Error ? e.message : "Invalid apps",
    };
  }

  if (!(await assertWorkspaceOwner(args.ownerSub, args.workspaceId))) {
    return { error: "forbidden", message: "Forbidden" };
  }

  const ws = await db
    .select({ kind: workspace.kind })
    .from(workspace)
    .where(eq(workspace.id, args.workspaceId))
    .limit(1);
  if (!ws[0]) return { error: "not_found", message: "Workspace not found" };
  if (ws[0].kind !== "shared") {
    return {
      error: "not_shared",
      message: "Only shared workspaces can add members",
    };
  }

  const targetSub = await findUserSubByEmail(args.email);
  if (!targetSub) {
    return { error: "user_not_found", message: "User not found" };
  }

  const existing = await getMemberRole(targetSub, args.workspaceId);
  if (existing) {
    return { error: "conflict", message: "Already a member" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(workspaceMember).values({
        workspaceId: args.workspaceId,
        userSub: targetSub,
        role: "member",
      });
      await tx.insert(workspaceMemberApp).values(
        apps.map((appKey) => ({
          workspaceId: args.workspaceId,
          userSub: targetSub,
          appKey,
        })),
      );
    });
  } catch {
    return { error: "conflict", message: "Already a member" };
  }

  return {
    data: {
      userSub: targetSub,
      email: args.email.trim().toLowerCase(),
      role: "member",
      apps,
    },
  };
}

export async function patchWorkspaceMemberApps(args: {
  ownerSub: string;
  workspaceId: string;
  userSub: string;
  apps: unknown;
}): Promise<
  | { data: { userSub: string; apps: ShareableWorkspaceAppKey[] } }
  | {
      error: "forbidden" | "not_found" | "bad_request";
      message: string;
    }
> {
  let apps: ShareableWorkspaceAppKey[];
  try {
    apps = parseShareableWorkspaceAppKeys(args.apps);
  } catch (e) {
    return {
      error: "bad_request",
      message: e instanceof Error ? e.message : "Invalid apps",
    };
  }

  if (!(await assertWorkspaceOwner(args.ownerSub, args.workspaceId))) {
    return { error: "forbidden", message: "Forbidden" };
  }

  const targetRole = await getMemberRole(args.userSub, args.workspaceId);
  if (!targetRole) return { error: "not_found", message: "Member not found" };
  if (targetRole === "owner") {
    return { error: "bad_request", message: "Cannot change owner app grants" };
  }

  await replaceMemberAppGrants(args.workspaceId, args.userSub, apps);
  return { data: { userSub: args.userSub, apps } };
}

export async function removeWorkspaceMember(args: {
  ownerSub: string;
  workspaceId: string;
  userSub: string;
}): Promise<
  | { data: { ok: true } }
  | { error: "forbidden" | "not_found" | "bad_request"; message: string }
> {
  if (!(await assertWorkspaceOwner(args.ownerSub, args.workspaceId))) {
    return { error: "forbidden", message: "Forbidden" };
  }

  const targetRole = await getMemberRole(args.userSub, args.workspaceId);
  if (!targetRole) return { error: "not_found", message: "Member not found" };
  if (targetRole === "owner") {
    return { error: "bad_request", message: "Cannot remove an owner" };
  }

  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, args.workspaceId),
        eq(workspaceMember.userSub, args.userSub),
      ),
    );

  return { data: { ok: true } };
}

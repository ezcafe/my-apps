/**
 * Cross-app workspace resolution: active cookie + `user_workspace_default` per `WorkspaceAppKey`.
 * Register new domains in `WORKSPACE_APP_KEYS` (`db/schema/workspace.ts`) and pass the same key here.
 */
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
  WORKSPACE_APP_KEYS,
  type WorkspaceAppKey,
} from "@/db/schema/workspace";

/** HttpOnly cookie per product area; see WORKSPACE_APP_KEYS in db/schema/workspace.ts */
export function workspaceCookieName(appKey: WorkspaceAppKey): string {
  return `ctx_workspace_${appKey}`;
}

export function parseWorkspaceAppKey(raw: string | null): WorkspaceAppKey | null {
  if (!raw) return null;
  return (WORKSPACE_APP_KEYS as readonly string[]).includes(raw)
    ? (raw as WorkspaceAppKey)
    : null;
}

export async function assertWorkspaceMember(
  userSub: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export async function getMemberRole(
  userSub: string,
  workspaceId: string,
): Promise<"owner" | "member" | null> {
  const row = await db
    .select({ role: workspaceMember.role })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row[0]?.role ?? null;
}

export async function assertWorkspaceOwner(
  userSub: string,
  workspaceId: string,
): Promise<boolean> {
  const role = await getMemberRole(userSub, workspaceId);
  return role === "owner";
}

/**
 * Resolve active workspace: cookie → saved default → personal workspace → first membership.
 */
export async function getActiveWorkspaceId(
  userSub: string,
  appKey: WorkspaceAppKey,
): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(workspaceCookieName(appKey))?.value;
  if (fromCookie && (await assertWorkspaceMember(userSub, fromCookie))) {
    return fromCookie;
  }

  const prefRow = await db
    .select({ defaultWorkspaceId: userWorkspaceDefault.defaultWorkspaceId })
    .from(userWorkspaceDefault)
    .where(
      and(
        eq(userWorkspaceDefault.userSub, userSub),
        eq(userWorkspaceDefault.appKey, appKey),
      ),
    )
    .limit(1);
  const defaultId = prefRow[0]?.defaultWorkspaceId;
  if (defaultId && (await assertWorkspaceMember(userSub, defaultId))) {
    return defaultId;
  }

  const personal = await db
    .select({ id: workspace.id })
    .from(workspace)
    .innerJoin(workspaceMember, eq(workspaceMember.workspaceId, workspace.id))
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspace.ownedByUserSub, userSub),
      ),
    )
    .limit(1);
  if (personal.length) return personal[0].id;

  const first = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(eq(workspaceMember.userSub, userSub))
    .limit(1);
  return first[0]?.workspaceId ?? null;
}

export function setActiveWorkspaceCookie(
  res: NextResponse,
  appKey: WorkspaceAppKey,
  workspaceId: string,
): NextResponse {
  res.cookies.set(workspaceCookieName(appKey), workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

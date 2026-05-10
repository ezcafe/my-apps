/**
 * Cross-app workspace resolution: active cookie + `user_workspace_default` per `WorkspaceAppKey`.
 * Register new domains in `WORKSPACE_APP_KEYS` (`db/schema/workspace.ts`) and pass the same key here.
 */
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
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

const COOKIE_WORKSPACE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookieWorkspaceId(raw: string | undefined): string | null {
  if (!raw || !COOKIE_WORKSPACE_UUID_RE.test(raw)) return null;
  return raw;
}

/**
 * Resolve active workspace in one round trip: cookie → saved default → personal → first membership.
 */
export async function getActiveWorkspaceId(
  userSub: string,
  appKey: WorkspaceAppKey,
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieId = parseCookieWorkspaceId(
    cookieStore.get(workspaceCookieName(appKey))?.value,
  );

  const result = await db.execute(sql`
    WITH prefs AS (
      SELECT
        ${cookieId}::uuid AS cookie_id,
        (
          SELECT default_workspace_id
          FROM user_workspace_default
          WHERE user_sub = ${userSub}
            AND app_key = ${appKey}
          LIMIT 1
        ) AS default_id
    ),
    personal AS (
      SELECT w.id
      FROM workspace w
      INNER JOIN workspace_member wm
        ON wm.workspace_id = w.id AND wm.user_sub = ${userSub}
      WHERE w.owned_by_user_sub = ${userSub}
      LIMIT 1
    ),
    first_mem AS (
      SELECT workspace_id AS id
      FROM workspace_member
      WHERE user_sub = ${userSub}
      ORDER BY workspace_id
      LIMIT 1
    ),
    candidates AS (
      SELECT 1 AS ord, cookie_id AS wid FROM prefs WHERE cookie_id IS NOT NULL
      UNION ALL
      SELECT 2, default_id FROM prefs WHERE default_id IS NOT NULL
      UNION ALL
      SELECT 3, id FROM personal
      UNION ALL
      SELECT 4, id FROM first_mem
    )
    SELECT c.wid::text AS workspace_id
    FROM candidates c
    INNER JOIN workspace_member wm
      ON wm.workspace_id = c.wid AND wm.user_sub = ${userSub}
    ORDER BY c.ord
    LIMIT 1
  `);

  const rows = Array.from(
    result as unknown as Iterable<{ workspace_id: string | null }>,
  );
  return rows[0]?.workspace_id ?? null;
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

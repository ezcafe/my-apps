import { NextResponse } from "next/server";
import { runInWorkspace } from "@/db";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  hasWriteScope,
  resolveRequestAuth,
  type ResolvedRequestAuth,
  verifyMoneyWorkspaceAccess,
} from "@/lib/api-auth";
import type { ApiTokenScope } from "@/db/schema/api-token";
import { setActiveWorkspaceCookie } from "@/lib/workspace-context";
import {
  BABY_APP_KEY,
  getBabyWorkspaceIdForUser,
} from "@/lib/workspace-baby";

export async function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message, code: "unauthorized" }, { status: 401 });
}

export async function badRequest(message: string) {
  return NextResponse.json({ error: message, code: "bad_request" }, { status: 400 });
}

export async function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, code: "forbidden" }, { status: 403 });
}

export async function notFound(message = "Not found") {
  return NextResponse.json({ error: message, code: "not_found" }, { status: 404 });
}

export function babyDbUnavailable() {
  return NextResponse.json(
    {
      error:
        "Cannot reach PostgreSQL. Start the database (from the apps folder: docker compose up -d) or fix DATABASE_URL.",
      code: "db_unavailable",
    },
    { status: 503 },
  );
}

export type BabyRequestContext = {
  userSub: string;
  workspaceId: string;
  auth: ResolvedRequestAuth;
};

async function resolveBabyWorkspaceId(
  auth: ResolvedRequestAuth,
): Promise<string | null> {
  if (!auth.userSub) return null;
  // Baby MVP is session-only; API tokens stay Money-scoped.
  if (auth.method === "api_key") return null;
  try {
    return await getBabyWorkspaceIdForUser(auth.userSub);
  } catch {
    return null;
  }
}

export async function requireBabyContext(
  request?: Request,
  options?: { requireWrite?: boolean },
): Promise<BabyRequestContext | { error: NextResponse }> {
  let auth: ResolvedRequestAuth;
  try {
    auth = await resolveRequestAuth(request);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: babyDbUnavailable() };
    throw e;
  }

  if (!auth.userSub) {
    return { error: await unauthorized() };
  }

  if (options?.requireWrite && !hasWriteScope(auth.scopes)) {
    return { error: await forbidden("Token lacks write scope") };
  }

  let workspaceId: string | null;
  try {
    workspaceId = await resolveBabyWorkspaceId(auth);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: babyDbUnavailable() };
    throw e;
  }

  if (!workspaceId) {
    return { error: await forbidden("No workspace") };
  }

  let ok: boolean;
  try {
    ok = await verifyMoneyWorkspaceAccess(auth, workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: babyDbUnavailable() };
    throw e;
  }

  if (!ok) {
    return { error: await forbidden() };
  }

  return { userSub: auth.userSub, workspaceId, auth };
}

export function withBabyWorkspaceCookie(res: NextResponse, workspaceId: string) {
  return setActiveWorkspaceCookie(res, BABY_APP_KEY, workspaceId);
}

export function babyContextFromAuth(
  auth: ResolvedRequestAuth & { userSub: string; workspaceId: string },
): { userSub: string; workspaceId: string; scopes: ApiTokenScope[] | null } {
  return {
    userSub: auth.userSub,
    workspaceId: auth.workspaceId,
    scopes: auth.method === "api_key" ? auth.scopes : null,
  };
}

export async function withBabyWorkspaceRls<T>(
  ctx: BabyRequestContext,
  run: () => Promise<T>,
): Promise<T> {
  return runInWorkspace(ctx.workspaceId, run);
}

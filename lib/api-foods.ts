import { NextResponse } from "next/server";
import { runInWorkspace } from "@/db";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  badRequest,
  dbUnavailable,
  forbidden,
  notFound,
  rateLimited,
  unauthorized,
} from "@/lib/api-http";
import {
  hasWriteScope,
  resolveRequestAuth,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";
import { assertWorkspaceAppAccess } from "@/lib/workspace-app-access";
import { getFoodsWorkspaceIdForUser } from "@/lib/workspace-foods";
import { setActiveWorkspaceCookie } from "@/lib/workspace-context";

export {
  unauthorized,
  badRequest,
  forbidden,
  notFound,
  rateLimited,
};

export function foodsDbUnavailable() {
  return dbUnavailable();
}

export type FoodsRequestContext = {
  userSub: string;
  workspaceId: string;
  auth: ResolvedRequestAuth;
};

export async function resolveFoodsWorkspaceId(
  auth: ResolvedRequestAuth,
): Promise<string | null> {
  if (!auth.userSub) return null;
  // Session-only for v1 (no foods API-token grant yet).
  if (auth.method === "api_key") return null;
  try {
    return await getFoodsWorkspaceIdForUser(auth.userSub);
  } catch {
    return null;
  }
}

export async function verifyFoodsWorkspaceAccess(
  auth: ResolvedRequestAuth,
  workspaceId: string,
): Promise<boolean> {
  if (!auth.userSub) return false;
  try {
    return await assertWorkspaceAppAccess(auth.userSub, workspaceId, "foods");
  } catch {
    return false;
  }
}

export async function requireFoodsContext(
  request?: Request,
  options?: { requireWrite?: boolean },
): Promise<FoodsRequestContext | { error: NextResponse }> {
  let auth: ResolvedRequestAuth;
  try {
    auth = await resolveRequestAuth(request);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: foodsDbUnavailable() };
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
    workspaceId = await resolveFoodsWorkspaceId(auth);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: foodsDbUnavailable() };
    throw e;
  }

  if (!workspaceId) {
    return { error: await forbidden("No workspace") };
  }

  let ok: boolean;
  try {
    ok = await verifyFoodsWorkspaceAccess(auth, workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: foodsDbUnavailable() };
    throw e;
  }

  if (!ok) {
    return { error: await forbidden() };
  }

  return { userSub: auth.userSub, workspaceId, auth };
}

export function withFoodsWorkspaceCookie(res: NextResponse, workspaceId: string) {
  return setActiveWorkspaceCookie(res, "foods", workspaceId);
}

export async function withFoodsWorkspaceRls<T>(
  ctx: FoodsRequestContext,
  run: () => Promise<T>,
): Promise<T> {
  return runInWorkspace(ctx.workspaceId, run);
}

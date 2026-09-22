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
  resolveMoneyWorkspaceId,
  resolveRequestAuth,
  verifyMoneyWorkspaceAccess,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";
import type { ApiTokenScope } from "@/db/schema/api-token";
import { setActiveWorkspaceCookie } from "@/lib/workspace-context";

export {
  unauthorized,
  badRequest,
  forbidden,
  notFound,
  rateLimited,
};

export function moneyDbUnavailable() {
  return dbUnavailable();
}

export type MoneyRequestContext = {
  userSub: string;
  workspaceId: string;
  auth: ResolvedRequestAuth;
};

export async function requireMoneyContext(
  request?: Request,
  options?: { requireWrite?: boolean },
): Promise<MoneyRequestContext | { error: NextResponse }> {
  let auth: ResolvedRequestAuth;
  try {
    auth = await resolveRequestAuth(request);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: moneyDbUnavailable() };
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
    workspaceId = await resolveMoneyWorkspaceId(auth);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: moneyDbUnavailable() };
    throw e;
  }

  if (!workspaceId) {
    return { error: await forbidden("No workspace") };
  }

  let ok: boolean;
  try {
    ok = await verifyMoneyWorkspaceAccess(auth, workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) return { error: moneyDbUnavailable() };
    throw e;
  }

  if (!ok) {
    return { error: await forbidden() };
  }

  return { userSub: auth.userSub, workspaceId, auth };
}

export function withWorkspaceCookie(res: NextResponse, workspaceId: string) {
  return setActiveWorkspaceCookie(res, "money", workspaceId);
}

export function moneyContextFromAuth(
  auth: ResolvedRequestAuth & { userSub: string; workspaceId: string },
): { userSub: string; workspaceId: string; scopes: ApiTokenScope[] | null } {
  return {
    userSub: auth.userSub,
    workspaceId: auth.workspaceId,
    scopes: auth.method === "api_key" ? auth.scopes : null,
  };
}

export async function withMoneyWorkspaceRls<T>(
  ctx: MoneyRequestContext,
  run: () => Promise<T>,
): Promise<T> {
  return runInWorkspace(ctx.workspaceId, run);
}

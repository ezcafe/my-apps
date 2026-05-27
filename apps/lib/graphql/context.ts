import type { WorkspaceAppKey } from "@/db/schema/workspace";
import type { ApiTokenScope } from "@/db/schema/api-token";
import {
  hasWriteScope,
  resolveMoneyWorkspaceId,
  resolveRequestAuth,
  verifyMoneyWorkspaceAccess,
  type RequestAuthMethod,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";
import { isDbUnreachable } from "@/lib/db-errors";
import { parseWorkspaceAppKey } from "@/lib/workspace-context";

export type MoneyGraphQLContext = {
  requestId: string;
  responseHeaders: Headers;
  request?: Request;
  auth: ResolvedRequestAuth;
  userSub: string | null;
  workspaceId: string | null;
  /** User may browse authenticated routes without workspace binding until bootstrap resolves */
  workspaceMembershipVerified: boolean;
  authMethod: RequestAuthMethod | null;
  apiTokenId: string | null;
  scopes: ApiTokenScope[] | null;
  /** Per-request promise cache for deduplicating service-layer fetches. */
  loaders: Map<string, Promise<unknown>>;
};

export async function createMoneyGraphQLContext(
  requestId: string,
  responseHeaders: Headers,
  request?: Request,
): Promise<MoneyGraphQLContext> {
  let auth: ResolvedRequestAuth;
  try {
    auth = await resolveRequestAuth(request);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        requestId,
        responseHeaders,
        request,
        auth: {
          method: null,
          userSub: null,
          workspaceId: null,
          apiTokenId: null,
          scopes: null,
        },
        userSub: null,
        workspaceId: null,
        workspaceMembershipVerified: false,
        authMethod: null,
        apiTokenId: null,
        scopes: null,
        loaders: new Map(),
      };
    }
    throw e;
  }

  const userSub = auth.userSub;
  if (!userSub) {
    return {
      requestId,
      responseHeaders,
      request,
      auth,
      userSub: null,
      workspaceId: null,
      workspaceMembershipVerified: false,
      authMethod: null,
      apiTokenId: null,
      scopes: null,
      loaders: new Map(),
    };
  }

  let workspaceId: string | null = null;
  try {
    workspaceId = await resolveMoneyWorkspaceId(auth);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        requestId,
        responseHeaders,
        request,
        auth,
        userSub,
        workspaceId: null,
        workspaceMembershipVerified: false,
        authMethod: auth.method,
        apiTokenId: auth.method === "api_key" ? auth.apiTokenId : null,
        scopes: auth.method === "api_key" ? auth.scopes : null,
        loaders: new Map(),
      };
    }
    throw e;
  }

  if (!workspaceId) {
    return {
      requestId,
      responseHeaders,
      request,
      auth,
      userSub,
      workspaceId: null,
      workspaceMembershipVerified: false,
      authMethod: auth.method,
      apiTokenId: auth.method === "api_key" ? auth.apiTokenId : null,
      scopes: auth.method === "api_key" ? auth.scopes : null,
      loaders: new Map(),
    };
  }

  let ok = false;
  try {
    ok = await verifyMoneyWorkspaceAccess(auth, workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        requestId,
        responseHeaders,
        request,
        auth,
        userSub,
        workspaceId,
        workspaceMembershipVerified: false,
        authMethod: auth.method,
        apiTokenId: auth.method === "api_key" ? auth.apiTokenId : null,
        scopes: auth.method === "api_key" ? auth.scopes : null,
        loaders: new Map(),
      };
    }
    throw e;
  }

  return {
    requestId,
    responseHeaders,
    request,
    auth,
    userSub,
    workspaceId,
    workspaceMembershipVerified: ok,
    authMethod: auth.method,
    apiTokenId: auth.method === "api_key" ? auth.apiTokenId : null,
    scopes: auth.method === "api_key" ? auth.scopes : null,
    loaders: new Map(),
  };
}

export function requireAuth(ctx: MoneyGraphQLContext): string {
  if (!ctx.userSub) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx.userSub;
}

export function requireWriteScope(ctx: MoneyGraphQLContext): void {
  if (!hasWriteScope(ctx.scopes)) {
    throw new Error("FORBIDDEN");
  }
}

export function requireMoneyWorkspace(ctx: MoneyGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  const userSub = requireAuth(ctx);
  if (!ctx.workspaceId || !ctx.workspaceMembershipVerified) {
    throw new Error("FORBIDDEN");
  }
  return { userSub, workspaceId: ctx.workspaceId };
}

export function requireMoneyWriteWorkspace(ctx: MoneyGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  requireWriteScope(ctx);
  return requireMoneyWorkspace(ctx);
}

export function parseMoneyAppKey(raw: string): WorkspaceAppKey {
  const app = parseWorkspaceAppKey(raw);
  if (!app || app !== "money") {
    throw new Error("BAD_REQUEST: app must be money");
  }
  return app;
}

/** Session-only: block API tokens from workspace-admin mutations. */
export function requireSessionAuth(ctx: MoneyGraphQLContext): string {
  const userSub = requireAuth(ctx);
  if (ctx.authMethod === "api_key") {
    throw new Error("FORBIDDEN");
  }
  return userSub;
}

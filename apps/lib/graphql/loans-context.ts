import type { WorkspaceAppKey } from "@/db/schema/workspace";
import type { ApiTokenScope } from "@/db/schema/api-token";
import {
  hasWriteScope,
  resolveLoansWorkspaceId,
  resolveRequestAuth,
  verifyLoansWorkspaceAccess,
  type RequestAuthMethod,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";
import { isDbUnreachable } from "@/lib/db-errors";
import { parseWorkspaceAppKey } from "@/lib/workspace-context";

export type LoansGraphQLContext = {
  requestId: string;
  responseHeaders: Headers;
  request?: Request;
  auth: ResolvedRequestAuth;
  userSub: string | null;
  workspaceId: string | null;
  workspaceMembershipVerified: boolean;
  authMethod: RequestAuthMethod | null;
  apiTokenId: string | null;
  scopes: ApiTokenScope[] | null;
  loaders: Map<string, Promise<unknown>>;
};

export async function createLoansGraphQLContext(
  requestId: string,
  responseHeaders: Headers,
  request?: Request,
): Promise<LoansGraphQLContext> {
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
          apiTokenAppKey: null,
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
    workspaceId = await resolveLoansWorkspaceId(auth);
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
    ok = await verifyLoansWorkspaceAccess(auth, workspaceId);
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

export function requireLoansAuth(ctx: LoansGraphQLContext): string {
  if (!ctx.userSub) throw new Error("UNAUTHORIZED");
  return ctx.userSub;
}

export function requireLoansWriteScope(ctx: LoansGraphQLContext): void {
  if (!hasWriteScope(ctx.scopes)) throw new Error("FORBIDDEN");
}

export function requireLoansWorkspace(ctx: LoansGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  const userSub = requireLoansAuth(ctx);
  if (!ctx.workspaceId || !ctx.workspaceMembershipVerified) {
    throw new Error("FORBIDDEN");
  }
  return { userSub, workspaceId: ctx.workspaceId };
}

export function requireLoansWriteWorkspace(ctx: LoansGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  requireLoansWriteScope(ctx);
  return requireLoansWorkspace(ctx);
}

export function parseLoansAppKey(raw: string): WorkspaceAppKey {
  const app = parseWorkspaceAppKey(raw);
  if (!app || app !== "loans") {
    throw new Error("BAD_REQUEST: app must be loans");
  }
  return app;
}

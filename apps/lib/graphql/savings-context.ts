import type { ApiTokenScope } from "@/db/schema/api-token";
import {
  hasWriteScope,
  resolveRequestAuth,
  resolveSavingsWorkspaceId,
  verifyMoneyWorkspaceAccess,
  type RequestAuthMethod,
  type ResolvedRequestAuth,
} from "@/lib/api-auth";
import { isDbUnreachable } from "@/lib/db-errors";

export type SavingsGraphQLContext = {
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

const emptyAuth: ResolvedRequestAuth = {
  method: null,
  userSub: null,
  workspaceId: null,
  apiTokenId: null,
  apiTokenAppKey: null,
  scopes: null,
};

export async function createSavingsGraphQLContext(
  requestId: string,
  responseHeaders: Headers,
  request?: Request,
): Promise<SavingsGraphQLContext> {
  let auth: ResolvedRequestAuth;
  try {
    auth = await resolveRequestAuth(request);
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        requestId,
        responseHeaders,
        request,
        auth: emptyAuth,
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

  if (auth.method === "api_key" && auth.apiTokenAppKey !== "savings") {
    return {
      requestId,
      responseHeaders,
      request,
      auth: emptyAuth,
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
    workspaceId = await resolveSavingsWorkspaceId(auth);
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

export function requireSavingsAuth(ctx: SavingsGraphQLContext): string {
  if (!ctx.userSub) throw new Error("UNAUTHORIZED");
  return ctx.userSub;
}

export function requireSavingsWriteScope(ctx: SavingsGraphQLContext): void {
  if (!hasWriteScope(ctx.scopes)) throw new Error("FORBIDDEN");
}

export function requireSavingsWorkspace(ctx: SavingsGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  const userSub = requireSavingsAuth(ctx);
  if (!ctx.workspaceId || !ctx.workspaceMembershipVerified) {
    throw new Error("FORBIDDEN");
  }
  return { userSub, workspaceId: ctx.workspaceId };
}

export function requireSavingsWriteWorkspace(ctx: SavingsGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  requireSavingsWriteScope(ctx);
  return requireSavingsWorkspace(ctx);
}

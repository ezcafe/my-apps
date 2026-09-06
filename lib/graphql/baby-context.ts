import type { ApiTokenScope } from "@/db/schema/api-token";
import {
  hasWriteScope,
  resolveRequestAuth,
  type RequestAuthMethod,
  type ResolvedRequestAuth,
  verifyMoneyWorkspaceAccess,
} from "@/lib/api-auth";
import { isDbUnreachable } from "@/lib/db-errors";
import { getBabyWorkspaceIdForUser } from "@/lib/workspace-baby";

export type BabyGraphQLContext = {
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

export async function createBabyGraphQLContext(
  requestId: string,
  responseHeaders: Headers,
  request?: Request,
  preResolvedAuth?: ResolvedRequestAuth,
): Promise<BabyGraphQLContext> {
  let auth: ResolvedRequestAuth;
  try {
    auth = preResolvedAuth ?? (await resolveRequestAuth(request));
  } catch (e) {
    if (isDbUnreachable(e)) {
      return emptyCtx(requestId, responseHeaders, request);
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
    if (auth.method === "api_key") {
      workspaceId = null;
    } else {
      workspaceId = await getBabyWorkspaceIdForUser(userSub);
    }
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

function emptyCtx(
  requestId: string,
  responseHeaders: Headers,
  request?: Request,
): BabyGraphQLContext {
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

export function requireBabyAuth(ctx: BabyGraphQLContext): string {
  if (!ctx.userSub) throw new Error("UNAUTHORIZED");
  return ctx.userSub;
}

export function requireBabyWorkspace(ctx: BabyGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  const userSub = requireBabyAuth(ctx);
  if (!ctx.workspaceId || !ctx.workspaceMembershipVerified) {
    throw new Error("FORBIDDEN");
  }
  return { userSub, workspaceId: ctx.workspaceId };
}

export function requireBabyWriteWorkspace(ctx: BabyGraphQLContext): {
  userSub: string;
  workspaceId: string;
} {
  if (!hasWriteScope(ctx.scopes)) throw new Error("FORBIDDEN");
  return requireBabyWorkspace(ctx);
}

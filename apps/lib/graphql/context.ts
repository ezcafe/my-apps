import type { WorkspaceAppKey } from "@/db/schema/workspace";
import { auth } from "@/auth";
import {
  assertWorkspaceMember,
  parseWorkspaceAppKey,
} from "@/lib/workspace-context";
import { getWorkspaceIdForUser } from "@/lib/workspace";

export type MoneyGraphQLContext = {
  responseHeaders: Headers;
  userSub: string | null;
  workspaceId: string | null;
  /** User may browse authenticated routes without workspace binding until bootstrap resolves */
  workspaceMembershipVerified: boolean;
};

export async function createMoneyGraphQLContext(
  responseHeaders: Headers,
): Promise<MoneyGraphQLContext> {
  const session = await auth();
  const userSub = session?.user?.id ?? null;
  if (!userSub) {
    return {
      responseHeaders,
      userSub: null,
      workspaceId: null,
      workspaceMembershipVerified: false,
    };
  }

  let workspaceId: string | null = null;
  try {
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch {
    workspaceId = null;
  }

  if (!workspaceId) {
    return {
      responseHeaders,
      userSub,
      workspaceId: null,
      workspaceMembershipVerified: false,
    };
  }

  let ok = false;
  try {
    ok = await assertWorkspaceMember(userSub, workspaceId);
  } catch {
    ok = false;
  }

  return {
    responseHeaders,
    userSub,
    workspaceId,
    workspaceMembershipVerified: ok,
  };
}

export function requireAuth(ctx: MoneyGraphQLContext): string {
  if (!ctx.userSub) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx.userSub;
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

export function parseMoneyAppKey(raw: string): WorkspaceAppKey {
  const app = parseWorkspaceAppKey(raw);
  if (!app || app !== "money") {
    throw new Error("BAD_REQUEST: app must be money");
  }
  return app;
}

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import {
  moneyDbUnavailable,
  unauthorized,
  withWorkspaceCookie,
} from "@/lib/api-money";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  fetchMoneyLookups,
  fetchWorkspacesForUser,
} from "@/lib/money-workspace-bootstrap-data";
import { getWorkspaceIdForUser } from "@/lib/workspace";

/**
 * Single first-load payload: workspace init fields + workspace list + money lookups.
 * Replaces parallel GETs to /workspace/init, /workspace/list, accounts, categories, merchants, tags.
 */
export async function GET() {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  let workspaceId: string | null;
  try {
    await ensureUserBootstrap(userSub);
    workspaceId = await getWorkspaceIdForUser(userSub);
  } catch (e) {
    if (isDbUnreachable(e)) return moneyDbUnavailable();
    throw e;
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace unavailable", code: "workspace_error" },
      { status: 500 },
    );
  }

  const [ws, wsPack, lookups] = await Promise.all([
    db
      .select({ defaultCurrency: workspace.defaultCurrency })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1),
    fetchWorkspacesForUser(userSub, "money"),
    fetchMoneyLookups(workspaceId),
  ]);

  const defaultCurrency = ws[0]?.defaultCurrency ?? null;

  const res = NextResponse.json({
    data: {
      workspaceId,
      defaultCurrency,
      needsCurrencySetup: !defaultCurrency,
      workspaces: wsPack.workspaces,
      defaultWorkspaceId: wsPack.defaultWorkspaceId,
      ...lookups,
    },
  });
  return withWorkspaceCookie(res, workspaceId);
}

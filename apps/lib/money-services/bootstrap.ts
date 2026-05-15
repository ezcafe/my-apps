import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  fetchMoneyLookups,
  fetchWorkspacesForUser,
  type MoneyWorkspaceBootstrapData,
} from "@/lib/money-workspace-bootstrap-data";
import { getWorkspaceIdForUser } from "@/lib/workspace";

export async function fetchMoneyBootstrapPayload(
  userSub: string,
): Promise<MoneyWorkspaceBootstrapData> {
  await ensureUserBootstrap(userSub);
  const workspaceId = await getWorkspaceIdForUser(userSub);
  if (!workspaceId) {
    throw new Error("Workspace unavailable");
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

  return {
    workspaceId,
    defaultCurrency,
    needsCurrencySetup: !defaultCurrency,
    workspaces: wsPack.workspaces,
    defaultWorkspaceId: wsPack.defaultWorkspaceId,
    ...lookups,
  };
}

export async function fetchMoneyBootstrapSafe(userSub: string): Promise<
  | { ok: true; data: MoneyWorkspaceBootstrapData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  try {
    const data = await fetchMoneyBootstrapPayload(userSub);
    return { ok: true, data };
  } catch (e) {
    if (isDbUnreachable(e)) {
      return {
        ok: false,
        code: "db_unavailable",
        message:
          "Cannot reach PostgreSQL. Start the database or fix DATABASE_URL.",
      };
    }
    const message = e instanceof Error ? e.message : "Workspace unavailable";
    return { ok: false, code: "workspace_error", message };
  }
}

import { eq } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
import { workspace } from "@/db/schema/workspace";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isDbUnreachable } from "@/lib/db-errors";
import { countDueLoanInstallments } from "@/lib/loans-services/due";
import {
  fetchWorkspacesForUser,
  type BootstrapWorkspaceRow,
} from "@/lib/workspace-list";
import { getLoansWorkspaceIdForUser } from "@/lib/workspace-loans";

export type LoansWorkspaceCoreData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  workspaces: BootstrapWorkspaceRow[];
  defaultWorkspaceId: string | null;
  dueCount: number;
};

export type LoansBootstrapData = LoansWorkspaceCoreData;

export async function fetchLoansWorkspaceStatePayload(
  userSub: string,
): Promise<LoansWorkspaceCoreData> {
  let workspaceId = await getLoansWorkspaceIdForUser(userSub);
  if (!workspaceId) {
    await ensureUserBootstrap(userSub);
    workspaceId = await getLoansWorkspaceIdForUser(userSub);
  }
  if (!workspaceId) {
    throw new Error("Workspace unavailable");
  }

  const [ws, wsPack, dueCount] = await Promise.all([
    db
      .select({
        defaultCurrency: workspace.defaultCurrency,
        tzName: workspace.tzName,
      })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1),
    fetchWorkspacesForUser(userSub, "money"),
    runInWorkspace(workspaceId, () => countDueLoanInstallments(workspaceId)),
  ]);

  const defaultCurrency = ws[0]?.defaultCurrency ?? null;

  return {
    workspaceId,
    defaultCurrency,
    needsCurrencySetup: !defaultCurrency,
    workspaces: wsPack.workspaces,
    defaultWorkspaceId: wsPack.defaultWorkspaceId,
    dueCount,
  };
}

export async function fetchLoansBootstrapSafe(userSub: string): Promise<
  | { ok: true; data: LoansBootstrapData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  try {
    const data = await fetchLoansWorkspaceStatePayload(userSub);
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

import { eq } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
import { workspace } from "@/db/schema/workspace";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  fetchWorkspacesForUser,
  type BootstrapWorkspaceRow,
} from "@/lib/money-workspace-bootstrap-data";
import { getInvestmentWorkspaceIdForUser } from "@/lib/workspace-investment";
import { countInvestmentInstruments } from "@/lib/investment-services/instruments";

export type InvestmentBootstrapData = {
  workspaceId: string;
  defaultCurrency: string | null;
  needsCurrencySetup: boolean;
  workspaces: BootstrapWorkspaceRow[];
  defaultWorkspaceId: string | null;
  instrumentCount: number;
};

export async function fetchInvestmentBootstrapSafe(userSub: string): Promise<
  | { ok: true; data: InvestmentBootstrapData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  try {
    await ensureUserBootstrap(userSub);
    const workspaceId = await getInvestmentWorkspaceIdForUser(userSub);
    if (!workspaceId) {
      return { ok: false, code: "workspace_error", message: "Workspace unavailable" };
    }

    const [ws, wsPack, instrumentCount] = await Promise.all([
      db
        .select({ defaultCurrency: workspace.defaultCurrency })
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .limit(1),
      fetchWorkspacesForUser(userSub, "money"),
      runInWorkspace(workspaceId, () =>
        countInvestmentInstruments(workspaceId),
      ),
    ]);

    return {
      ok: true,
      data: {
        workspaceId,
        defaultCurrency: ws[0]?.defaultCurrency ?? null,
        needsCurrencySetup: !ws[0]?.defaultCurrency,
        workspaces: wsPack.workspaces,
        defaultWorkspaceId: wsPack.defaultWorkspaceId,
        instrumentCount,
      },
    };
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

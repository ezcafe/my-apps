import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspace } from "@/db/schema/workspace";
import { ensureUserBootstrap } from "@/lib/bootstrap";
import { isDbUnreachable } from "@/lib/db-errors";
import {
  ensureDefaultSystemAccountsForWorkspace,
  ensureNecessitiesSeedCategoriesForWorkspace,
  needsDefaultSystemAccounts,
  needsNecessitiesSeedCategories,
} from "@/lib/money-seed-defaults";
import {
  fetchMoneyLookups,
  type MoneyWorkspaceCoreData,
  type MoneyWorkspaceBootstrapData,
} from "@/lib/money-workspace-bootstrap-data";
import { fetchWorkspacesForUser } from "@/lib/workspace-list";
import { getWorkspaceIdForUser } from "@/lib/workspace";

export async function fetchMoneyWorkspaceStatePayload(
  userSub: string,
): Promise<MoneyWorkspaceCoreData> {
  let workspaceId = await getWorkspaceIdForUser(userSub);
  if (!workspaceId) {
    await ensureUserBootstrap(userSub);
    workspaceId = await getWorkspaceIdForUser(userSub);
  }
  if (!workspaceId) {
    throw new Error("Workspace unavailable");
  }

  const [ws, wsPack] = await Promise.all([
    db
      .select({ defaultCurrency: workspace.defaultCurrency })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1),
    fetchWorkspacesForUser(userSub, "money"),
  ]);

  const defaultCurrency = ws[0]?.defaultCurrency ?? null;

  return {
    workspaceId,
    defaultCurrency,
    needsCurrencySetup: !defaultCurrency,
    workspaces: wsPack.workspaces,
    defaultWorkspaceId: wsPack.defaultWorkspaceId,
  };
}

export async function fetchMoneyBootstrapFromWorkspaceState(
  workspaceState: MoneyWorkspaceCoreData,
): Promise<MoneyWorkspaceBootstrapData> {
  const workspaceCurrency = workspaceState.defaultCurrency ?? "USD";
  let lookups = await fetchMoneyLookups(
    workspaceState.workspaceId,
    workspaceCurrency,
  );

  const missingCategories = needsNecessitiesSeedCategories(lookups.categories);
  const missingAccounts = needsDefaultSystemAccounts(lookups.accounts);

  if (missingCategories || missingAccounts) {
    await Promise.all([
      missingCategories
        ? ensureNecessitiesSeedCategoriesForWorkspace(
            db,
            workspaceState.workspaceId,
          )
        : Promise.resolve(),
      missingAccounts
        ? ensureDefaultSystemAccountsForWorkspace(
            db,
            workspaceState.workspaceId,
            workspaceCurrency,
          )
        : Promise.resolve(),
    ]);
    lookups = await fetchMoneyLookups(
      workspaceState.workspaceId,
      workspaceCurrency,
    );
  }

  return {
    ...workspaceState,
    ...lookups,
  };
}

export async function fetchMoneyBootstrapPayload(
  userSub: string,
): Promise<MoneyWorkspaceBootstrapData> {
  const workspaceState = await fetchMoneyWorkspaceStatePayload(userSub);
  return fetchMoneyBootstrapFromWorkspaceState(workspaceState);
}

export async function fetchMoneyWorkspaceStateSafe(userSub: string): Promise<
  | { ok: true; data: MoneyWorkspaceCoreData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  try {
    const data = await fetchMoneyWorkspaceStatePayload(userSub);
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

export async function completeMoneyBootstrapFromState(
  workspaceState: MoneyWorkspaceCoreData,
): Promise<
  | { ok: true; data: MoneyWorkspaceBootstrapData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  try {
    const data = await fetchMoneyBootstrapFromWorkspaceState(workspaceState);
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

export async function fetchMoneyBootstrapSafe(userSub: string): Promise<
  | { ok: true; data: MoneyWorkspaceBootstrapData }
  | { ok: false; code: "db_unavailable" | "workspace_error"; message: string }
> {
  const state = await fetchMoneyWorkspaceStateSafe(userSub);
  if (!state.ok) return state;
  return completeMoneyBootstrapFromState(state.data);
}

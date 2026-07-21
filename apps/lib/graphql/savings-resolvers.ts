import { GraphQLError } from "graphql";
import { runInWorkspace } from "@/db";
import {
  requireSavingsAuth,
  requireSavingsWorkspace,
  requireSavingsWriteWorkspace,
  type SavingsGraphQLContext,
} from "@/lib/graphql/savings-context";
import { fetchSavingsBootstrapSafe } from "@/lib/savings-services/bootstrap";
import {
  createSavingsAccount,
  listSavingsAccounts,
  updateSavingsAccount,
} from "@/lib/savings-services/accounts";
import {
  createSavingsActivity,
  deleteSavingsActivity,
  getSavingsActivity,
  listSavingsActivities,
  savingsBalanceSeries,
  signedActivityDelta,
  updateSavingsActivity,
} from "@/lib/savings-services/activities";
import {
  savingsAccountCreateSchema,
  savingsAccountUpdateSchema,
  savingsActivitiesQuerySchema,
  savingsActivityCreateSchema,
  savingsActivityUpdateSchema,
} from "@/lib/validators/savings";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsActivity } from "@/db/schema/savings";

function gqlErr(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function mapServiceError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "UNAUTHORIZED") gqlErr("Unauthorized", "UNAUTHORIZED");
  if (msg === "FORBIDDEN") gqlErr("Forbidden", "FORBIDDEN");
  if (msg === "NOT_FOUND") gqlErr("Not found", "NOT_FOUND");
  gqlErr(msg, "BAD_REQUEST");
}

async function accountBalanceMinor(workspaceId: string, accountId: string) {
  const rows = await db
    .select({
      type: savingsActivity.type,
      amountMinor: savingsActivity.amountMinor,
    })
    .from(savingsActivity)
    .where(
      and(
        eq(savingsActivity.workspaceId, workspaceId),
        eq(savingsActivity.accountId, accountId),
      ),
    );
  return rows.reduce(
    (sum, r) => sum + signedActivityDelta(r.type, r.amountMinor),
    0,
  );
}

function mapAccountRow(
  row: Awaited<ReturnType<typeof listSavingsAccounts>>[number],
  balanceMinor: number,
) {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    sortOrder: row.sortOrder,
    archived: row.archived !== 0,
    balanceMinor,
  };
}

export const savingsResolvers = {
  Query: {
    savingsBootstrap: async (
      _: unknown,
      __: unknown,
      ctx: SavingsGraphQLContext,
    ) => {
      const userSub = requireSavingsAuth(ctx);
      const result = await fetchSavingsBootstrapSafe(userSub);
      if (!result.ok) {
        if (result.code === "db_unavailable") {
          gqlErr(result.message, "DB_UNAVAILABLE");
        }
        gqlErr(result.message, "WORKSPACE_ERROR");
      }
      return result.data;
    },
    savingsAccounts: async (_: unknown, __: unknown, ctx: SavingsGraphQLContext) => {
      const { workspaceId } = requireSavingsWorkspace(ctx);
      return runInWorkspace(workspaceId, async () => {
        const accounts = await listSavingsAccounts(workspaceId);
        const out = [];
        for (const a of accounts) {
          const balanceMinor = await accountBalanceMinor(workspaceId, a.id);
          out.push(mapAccountRow(a, balanceMinor));
        }
        return out;
      });
    },
    savingsActivities: async (
      _: unknown,
      args: { query?: Record<string, unknown> },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWorkspace(ctx);
      const parsed = savingsActivitiesQuerySchema.safeParse(args.query ?? {});
      if (!parsed.success) gqlErr("Invalid query", "BAD_REQUEST");
      return runInWorkspace(workspaceId, () =>
        listSavingsActivities(workspaceId, parsed.data),
      );
    },
    savingsActivity: async (
      _: unknown,
      args: { id: string },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWorkspace(ctx);
      const row = await runInWorkspace(workspaceId, () =>
        getSavingsActivity(workspaceId, args.id),
      );
      if (!row) return null;
      const joined = await runInWorkspace(workspaceId, () =>
        listSavingsActivities(workspaceId, { limit: 200 }),
      );
      return joined.items.find((i) => i.id === args.id) ?? null;
    },
    savingsBalanceSeries: async (
      _: unknown,
      args: { from: string; to: string },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWorkspace(ctx);
      return runInWorkspace(workspaceId, () =>
        savingsBalanceSeries(workspaceId, args.from, args.to),
      );
    },
  },
  Mutation: {
    savingsAccountCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWriteWorkspace(ctx);
      const parsed = savingsAccountCreateSchema.safeParse(args.input);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createSavingsAccount(workspaceId, parsed.data),
        );
        return mapAccountRow(row, 0);
      } catch (e) {
        mapServiceError(e);
      }
    },
    savingsAccountUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWriteWorkspace(ctx);
      const parsed = savingsAccountUpdateSchema.safeParse(args.input);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const row = await runInWorkspace(workspaceId, () =>
          updateSavingsAccount(workspaceId, args.id, parsed.data),
        );
        const balanceMinor = await accountBalanceMinor(workspaceId, row.id);
        return mapAccountRow(row, balanceMinor);
      } catch (e) {
        mapServiceError(e);
      }
    },
    savingsActivityCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWriteWorkspace(ctx);
      const raw = {
        ...args.input,
        amountMinor: Number(args.input.amountMinor),
      };
      const parsed = savingsActivityCreateSchema.safeParse(raw);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const created = await runInWorkspace(workspaceId, () =>
          createSavingsActivity(workspaceId, parsed.data),
        );
        const joined = await listSavingsActivities(workspaceId, { limit: 200 });
        const item = joined.items.find((i) => i.id === created.id);
        if (!item) gqlErr("Not found", "NOT_FOUND");
        return item;
      } catch (e) {
        mapServiceError(e);
      }
    },
    savingsActivityUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWriteWorkspace(ctx);
      const raw = {
        ...args.input,
        ...(args.input.amountMinor != null
          ? { amountMinor: Number(args.input.amountMinor) }
          : {}),
      };
      const parsed = savingsActivityUpdateSchema.safeParse(raw);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        await runInWorkspace(workspaceId, () =>
          updateSavingsActivity(workspaceId, args.id, parsed.data),
        );
        const joined = await listSavingsActivities(workspaceId, { limit: 200 });
        const item = joined.items.find((i) => i.id === args.id);
        if (!item) gqlErr("Not found", "NOT_FOUND");
        return item;
      } catch (e) {
        mapServiceError(e);
      }
    },
    savingsActivityDelete: async (
      _: unknown,
      args: { id: string },
      ctx: SavingsGraphQLContext,
    ) => {
      const { workspaceId } = requireSavingsWriteWorkspace(ctx);
      try {
        await runInWorkspace(workspaceId, () =>
          deleteSavingsActivity(workspaceId, args.id),
        );
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },
  },
};

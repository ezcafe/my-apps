import { GraphQLError } from "graphql";
import { runInWorkspace } from "@/db";
import {
  requireInvestmentAuth,
  requireInvestmentWorkspace,
  requireInvestmentWriteWorkspace,
  type InvestmentGraphQLContext,
} from "@/lib/graphql/investment-context";
import { fetchInvestmentBootstrapSafe } from "@/lib/investment-services/bootstrap";
import {
  createInvestmentInstrument,
  listInvestmentInstruments,
  updateInvestmentInstrument,
} from "@/lib/investment-services/instruments";
import {
  createInvestmentActivity,
  deleteInvestmentActivity,
  getInvestmentActivity,
  listInvestmentActivities,
  updateInvestmentActivity,
} from "@/lib/investment-services/activities";
import {
  investmentPortfolioValueSeries,
  investmentHoldingsSnapshot,
} from "@/lib/investment-services/portfolio-series";
import { refreshQuotesForWorkspace } from "@/lib/investment-services/quotes";
import {
  investmentActivitiesQuerySchema,
  investmentActivityCreateSchema,
  investmentActivityUpdateSchema,
  investmentInstrumentCreateSchema,
  investmentInstrumentUpdateSchema,
} from "@/lib/validators/investment";

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

function mapInstrument(
  row: Awaited<ReturnType<typeof listInvestmentInstruments>>[number],
) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    currency: row.currency,
    symbol: row.symbol,
    yahooSymbol: row.yahooSymbol,
    archived: row.archived !== 0,
  };
}

export const investmentResolvers = {
  Query: {
    investmentBootstrap: async (
      _: unknown,
      __: unknown,
      ctx: InvestmentGraphQLContext,
    ) => {
      const userSub = requireInvestmentAuth(ctx);
      const result = await fetchInvestmentBootstrapSafe(userSub);
      if (!result.ok) {
        if (result.code === "db_unavailable") {
          gqlErr(result.message, "DB_UNAVAILABLE");
        }
        gqlErr(result.message, "WORKSPACE_ERROR");
      }
      return result.data;
    },
    investmentInstruments: async (
      _: unknown,
      __: unknown,
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWorkspace(ctx);
      const rows = await runInWorkspace(workspaceId, () =>
        listInvestmentInstruments(workspaceId),
      );
      return rows.map(mapInstrument);
    },
    investmentActivities: async (
      _: unknown,
      args: { query?: Record<string, unknown> },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWorkspace(ctx);
      const parsed = investmentActivitiesQuerySchema.safeParse(args.query ?? {});
      if (!parsed.success) gqlErr("Invalid query", "BAD_REQUEST");
      return runInWorkspace(workspaceId, () =>
        listInvestmentActivities(workspaceId, parsed.data),
      );
    },
    investmentActivity: async (
      _: unknown,
      args: { id: string },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWorkspace(ctx);
      const row = await runInWorkspace(workspaceId, () =>
        getInvestmentActivity(workspaceId, args.id),
      );
      if (!row) return null;
      const joined = await listInvestmentActivities(workspaceId, { limit: 200 });
      return joined.items.find((i) => i.id === args.id) ?? null;
    },
    investmentPortfolioValueSeries: async (
      _: unknown,
      args: { from: string; to: string },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWorkspace(ctx);
      return runInWorkspace(workspaceId, () =>
        investmentPortfolioValueSeries(workspaceId, args.from, args.to),
      );
    },
    investmentHoldingsSnapshot: async (
      _: unknown,
      __: unknown,
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWorkspace(ctx);
      return runInWorkspace(workspaceId, () =>
        investmentHoldingsSnapshot(workspaceId),
      );
    },
  },
  Mutation: {
    investmentInstrumentCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      const parsed = investmentInstrumentCreateSchema.safeParse(args.input);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const row = await runInWorkspace(workspaceId, () =>
          createInvestmentInstrument(workspaceId, parsed.data),
        );
        return mapInstrument(row);
      } catch (e) {
        mapServiceError(e);
      }
    },
    investmentInstrumentUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      const parsed = investmentInstrumentUpdateSchema.safeParse(args.input);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const row = await runInWorkspace(workspaceId, () =>
          updateInvestmentInstrument(workspaceId, args.id, parsed.data),
        );
        return mapInstrument(row);
      } catch (e) {
        mapServiceError(e);
      }
    },
    investmentActivityCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      const raw = {
        ...args.input,
        unitPriceMinor:
          args.input.unitPriceMinor != null
            ? Number(args.input.unitPriceMinor)
            : undefined,
        amountMinor:
          args.input.amountMinor != null
            ? Number(args.input.amountMinor)
            : undefined,
      };
      const parsed = investmentActivityCreateSchema.safeParse(raw);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        const created = await runInWorkspace(workspaceId, () =>
          createInvestmentActivity(workspaceId, parsed.data),
        );
        const joined = await listInvestmentActivities(workspaceId, { limit: 200 });
        const item = joined.items.find((i) => i.id === created.id);
        if (!item) gqlErr("Not found", "NOT_FOUND");
        return item;
      } catch (e) {
        mapServiceError(e);
      }
    },
    investmentActivityUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      const raw = {
        ...args.input,
        ...(args.input.unitPriceMinor != null
          ? { unitPriceMinor: Number(args.input.unitPriceMinor) }
          : {}),
        ...(args.input.amountMinor != null
          ? { amountMinor: Number(args.input.amountMinor) }
          : {}),
      };
      const parsed = investmentActivityUpdateSchema.safeParse(raw);
      if (!parsed.success) gqlErr("Invalid input", "BAD_REQUEST");
      try {
        await runInWorkspace(workspaceId, () =>
          updateInvestmentActivity(workspaceId, args.id, parsed.data),
        );
        const joined = await listInvestmentActivities(workspaceId, { limit: 200 });
        const item = joined.items.find((i) => i.id === args.id);
        if (!item) gqlErr("Not found", "NOT_FOUND");
        return item;
      } catch (e) {
        mapServiceError(e);
      }
    },
    investmentActivityDelete: async (
      _: unknown,
      args: { id: string },
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      try {
        await runInWorkspace(workspaceId, () =>
          deleteInvestmentActivity(workspaceId, args.id),
        );
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },
    investmentRefreshQuotes: async (
      _: unknown,
      __: unknown,
      ctx: InvestmentGraphQLContext,
    ) => {
      const { workspaceId } = requireInvestmentWriteWorkspace(ctx);
      await runInWorkspace(workspaceId, () =>
        refreshQuotesForWorkspace(workspaceId),
      );
      return { ok: true };
    },
  },
};

import { GraphQLError } from "graphql";
import { GraphQLJSONObject } from "graphql-scalars";
import { analyticsFiltersSchema } from "@/lib/validators/money";
import { computeMoneyAnalytics } from "@/lib/money-services/analytics";
import { fetchMoneyBootstrapSafe } from "@/lib/money-services/bootstrap";
import {
  createMoneyBudget,
  deleteMoneyBudget,
  listMoneyBudgets,
  updateMoneyBudget,
} from "@/lib/money-services/budgets";
import {
  archiveMoneyAccount,
  createMoneyAccount,
  listMoneyAccounts,
  updateMoneyAccount,
} from "@/lib/money-services/accounts";
import {
  archiveMoneyCategory,
  createMoneyCategory,
  listMoneyCategories,
  updateMoneyCategory,
} from "@/lib/money-services/categories";
import {
  createMoneyMerchant,
  deleteMoneyMerchant,
  listMoneyMerchants,
  updateMoneyMerchant,
} from "@/lib/money-services/merchants";
import {
  createMoneyTag,
  deleteMoneyTag,
  listMoneyTags,
  updateMoneyTag,
} from "@/lib/money-services/tags";
import {
  createMoneyRule,
  deleteMoneyRule,
  listMoneyRules,
  updateMoneyRule,
} from "@/lib/money-services/rules";
import {
  createMoneyRecurrenceTemplate,
  deleteMoneyRecurrenceTemplate,
  generateMoneyRecurrenceOccurrence,
  listMoneyRecurrenceTemplates,
  updateMoneyRecurrenceTemplate,
} from "@/lib/money-services/recurrence";
import {
  createMoneyTransaction,
  deleteMoneyTransaction,
  getMoneyTransaction,
  listMoneyTransactions,
  updateMoneyTransaction,
} from "@/lib/money-services/transactions";
import { parseMoneyImportCsv } from "@/lib/money-services/csv-parse";
import {
  cloneMoneyWorkspaceApi,
  patchWorkspaceCurrency,
  resetMoneyWorkspaceApi,
  setActiveWorkspaceApi,
} from "@/lib/money-services/workspace-money";
import {
  appendActiveWorkspaceCookieHeader,
} from "@/lib/workspace-context";
import {
  parseMoneyAppKey,
  requireAuth,
  requireMoneyWorkspace,
  requireSessionAuth,
  requireWriteScope,
  type MoneyGraphQLContext,
} from "@/lib/graphql/context";

function gqlErr(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function mapServiceError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "UNAUTHORIZED") gqlErr("Unauthorized", "UNAUTHORIZED");
  if (msg === "FORBIDDEN") gqlErr("Forbidden", "FORBIDDEN");
  if (msg === "NOT_FOUND") gqlErr("Not found", "NOT_FOUND");
  if (msg === "DB_UNAVAILABLE") {
    gqlErr(
      "Cannot reach PostgreSQL. Start the database or fix DATABASE_URL.",
      "DB_UNAVAILABLE",
    );
  }
  gqlErr(msg, "BAD_REQUEST");
}

function filtersFromInput(raw: Record<string, unknown> | null | undefined) {
  const parsed = analyticsFiltersSchema.safeParse({
    from: raw?.from ?? undefined,
    to: raw?.to ?? undefined,
    accountIds: raw?.accountIds ?? undefined,
    categoryIds: raw?.categoryIds ?? undefined,
    merchantIds: raw?.merchantIds ?? undefined,
    tagIds: raw?.tagIds ?? undefined,
    kinds: raw?.kinds ?? undefined,
  });
  if (!parsed.success) {
    gqlErr(
      parsed.error.issues.map((i) => i.message).join("; ") || "Invalid filters",
      "BAD_REQUEST",
    );
  }
  return parsed.data;
}

type MutationHandler = (
  parent: unknown,
  args: unknown,
  ctx: MoneyGraphQLContext,
) => unknown;

function withMutationGuard(
  handlers: Record<string, MutationHandler>,
  before: (ctx: MoneyGraphQLContext) => void,
): Record<string, MutationHandler> {
  return Object.fromEntries(
    Object.entries(handlers).map(([key, handler]) => [
      key,
      async (parent, args, ctx) => {
        before(ctx);
        return handler(parent, args, ctx);
      },
    ]),
  );
}

const moneyMutations = withMutationGuard(
  {
    moneySetActiveWorkspace: async (
      _: unknown,
      args: { workspaceId: string; app: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const userSub = requireSessionAuth(ctx);
        const appKey = parseMoneyAppKey(args.app);
        await setActiveWorkspaceApi(userSub, args.workspaceId, appKey);
        appendActiveWorkspaceCookieHeader(
          ctx.responseHeaders,
          appKey,
          args.workspaceId,
        );
        return true;
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyWorkspaceCurrency: async (
      _: unknown,
      args: { workspaceId: string; defaultCurrency: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const userSub = requireAuth(ctx);
        return await patchWorkspaceCurrency(userSub, {
          workspaceId: args.workspaceId,
          defaultCurrency: args.defaultCurrency,
        });
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyWorkspaceClone: async (
      _: unknown,
      args: { targetWorkspaceId: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const userSub = requireSessionAuth(ctx);
        const { workspaceId } = requireMoneyWorkspace(ctx);
        await cloneMoneyWorkspaceApi(userSub, workspaceId, {
          targetWorkspaceId: args.targetWorkspaceId,
        });
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyWorkspaceReset: async (
      _: unknown,
      __: unknown,
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const userSub = requireSessionAuth(ctx);
        const { workspaceId } = requireMoneyWorkspace(ctx);
        await resetMoneyWorkspaceApi(userSub, workspaceId);
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyAccountCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyAccount(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyAccountUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyAccount(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyAccountArchive: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await archiveMoneyAccount(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyCategoryCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyCategory(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyCategoryUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyCategory(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyCategoryArchive: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await archiveMoneyCategory(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyMerchantCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyMerchant(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyMerchantUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyMerchant(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyMerchantDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyMerchant(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyTagCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyTag(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyTagUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyTag(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyTagDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyTag(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyBudgetCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await createMoneyBudget(workspaceId, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyBudgetUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await updateMoneyBudget(workspaceId, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyBudgetDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyBudget(workspaceId, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyRuleCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyRule(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyRuleUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyRule(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyRuleDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyRule(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyRecurrenceCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyRecurrenceTemplate(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyRecurrenceUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyRecurrenceTemplate(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyRecurrenceDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyRecurrenceTemplate(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyRecurrenceGenerate: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await generateMoneyRecurrenceOccurrence(ctxw, args.id);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyTransactionCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await createMoneyTransaction(ctxw, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyTransactionUpdate: async (
      _: unknown,
      args: { id: string; input: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        return await updateMoneyTransaction(ctxw, args.id, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    moneyTransactionDelete: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const ctxw = requireMoneyWorkspace(ctx);
        const ok = await deleteMoneyTransaction(ctxw, args.id);
        if (!ok) gqlErr("Not found", "NOT_FOUND");
        return { ok: true };
      } catch (e) {
        mapServiceError(e);
      }
    },
  } as Record<string, MutationHandler>,
  (ctx) => {
    requireWriteScope(ctx);
    requireMoneyWorkspace(ctx);
  },
);

export const moneyResolvers = {
  JSONObject: GraphQLJSONObject,

  Query: {
    moneyBootstrap: async (
      _: unknown,
      __: unknown,
      ctx: MoneyGraphQLContext,
    ) => {
      const userSub = requireAuth(ctx);
      const result = await fetchMoneyBootstrapSafe(userSub);
      if (!result.ok) {
        if (result.code === "db_unavailable") mapServiceError(new Error("DB_UNAVAILABLE"));
        gqlErr(result.message, "WORKSPACE_ERROR");
      }
      return result.data;
    },

    moneyAnalytics: async (
      _: unknown,
      args: { filters: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        const filters = filtersFromInput(args.filters);
        return await computeMoneyAnalytics(workspaceId, filters);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyBudgets: async (
      _: unknown,
      args: { includeSpent: boolean; from?: string | null; to?: string | null },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyBudgets(workspaceId, {
          includeSpent: args.includeSpent,
          from: args.from ?? null,
          to: args.to ?? null,
        });
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyTransactions: async (
      _: unknown,
      args: { query: Record<string, unknown> },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyTransactions(workspaceId, args.query);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyAccounts: async (_: unknown, __: unknown, ctx: MoneyGraphQLContext) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyAccounts(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyCategories: async (_: unknown, __: unknown, ctx: MoneyGraphQLContext) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyCategories(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyMerchants: async (_: unknown, __: unknown, ctx: MoneyGraphQLContext) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyMerchants(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyTags: async (_: unknown, __: unknown, ctx: MoneyGraphQLContext) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyTags(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyRules: async (_: unknown, __: unknown, ctx: MoneyGraphQLContext) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyRules(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyRecurrenceTemplates: async (
      _: unknown,
      __: unknown,
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await listMoneyRecurrenceTemplates(workspaceId);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyTransaction: async (
      _: unknown,
      args: { id: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        const { workspaceId } = requireMoneyWorkspace(ctx);
        return await getMoneyTransaction(workspaceId, args.id);
      } catch (e) {
        mapServiceError(e);
      }
    },

    moneyParseCsv: async (
      _: unknown,
      args: { csv: string },
      ctx: MoneyGraphQLContext,
    ) => {
      try {
        requireMoneyWorkspace(ctx);
        return parseMoneyImportCsv(args.csv);
      } catch (e) {
        mapServiceError(e);
      }
    },
  },

  Mutation: moneyMutations,
};

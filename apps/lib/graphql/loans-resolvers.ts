import { GraphQLError } from "graphql";
import { runInWorkspace } from "@/db";
import { fetchLoansBootstrapSafe } from "@/lib/loans-services/bootstrap";
import { listDueInstallments } from "@/lib/loans-services/due";
import {
  cancelLoan,
  createLoan,
  getLoanDetail,
  listLoans,
} from "@/lib/loans-services/loans";
import {
  markLoanInstallmentPaid,
  payLoanInstallmentWithTransaction,
} from "@/lib/loans-services/pay";
import {
  deleteLoanPushSubscription,
  saveLoanPushSubscription,
} from "@/lib/loans-services/push";
import {
  requireLoansAuth,
  requireLoansWorkspace,
  requireLoansWriteWorkspace,
  type LoansGraphQLContext,
} from "@/lib/graphql/loans-context";

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

export const loansResolvers = {
  Query: {
    loansBootstrap: async (_: unknown, __: unknown, ctx: LoansGraphQLContext) => {
      const userSub = requireLoansAuth(ctx);
      const result = await fetchLoansBootstrapSafe(userSub);
      if (!result.ok) {
        if (result.code === "db_unavailable") {
          gqlErr(result.message, "DB_UNAVAILABLE");
        }
        gqlErr(result.message, "WORKSPACE_ERROR");
      }
      return result.data;
    },
    loans: async (_: unknown, __: unknown, ctx: LoansGraphQLContext) => {
      const { workspaceId } = requireLoansWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          listLoans({ userSub: ctx.userSub!, workspaceId }),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loan: async (
      _: unknown,
      args: { id: string },
      ctx: LoansGraphQLContext,
    ) => {
      const { workspaceId } = requireLoansWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          getLoanDetail({ userSub: ctx.userSub!, workspaceId }, args.id),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loansDueInstallments: async (
      _: unknown,
      __: unknown,
      ctx: LoansGraphQLContext,
    ) => {
      const { workspaceId } = requireLoansWorkspace(ctx);
      return runInWorkspace(workspaceId, () =>
        listDueInstallments(workspaceId),
      );
    },
  },
  Mutation: {
    loanCreate: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: LoansGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireLoansWriteWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          createLoan(
            { userSub, workspaceId },
            args.input,
            (args.input.moneyWorkspaceId as string | undefined) ?? null,
          ),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loanCancel: async (
      _: unknown,
      args: { id: string },
      ctx: LoansGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireLoansWriteWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          cancelLoan({ userSub, workspaceId }, args.id),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loanInstallmentMarkPaid: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: LoansGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireLoansWriteWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          markLoanInstallmentPaid({ userSub, workspaceId }, args.input),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loanInstallmentPayWithTransaction: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: LoansGraphQLContext,
    ) => {
      const { userSub, workspaceId } = requireLoansWriteWorkspace(ctx);
      try {
        return await runInWorkspace(workspaceId, () =>
          payLoanInstallmentWithTransaction({ userSub, workspaceId }, args.input),
        );
      } catch (e) {
        mapServiceError(e);
      }
    },
    loanPushSubscriptionSave: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: LoansGraphQLContext,
    ) => {
      const userSub = requireLoansAuth(ctx);
      try {
        return await saveLoanPushSubscription(userSub, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
    loanPushSubscriptionDelete: async (
      _: unknown,
      args: { input: Record<string, unknown> },
      ctx: LoansGraphQLContext,
    ) => {
      const userSub = requireLoansAuth(ctx);
      try {
        return await deleteLoanPushSubscription(userSub, args.input);
      } catch (e) {
        mapServiceError(e);
      }
    },
  },
};

import type { MoneyGraphQLContext } from "@/lib/graphql/context";
import {
  createMoneyGraphQLContext,
  requireAuth,
  requireMoneyWorkspace,
  requireMoneyWriteWorkspace,
  requireWriteScope,
} from "@/lib/graphql/context";

export type LoansGraphQLContext = MoneyGraphQLContext;
export type InvestmentGraphQLContext = MoneyGraphQLContext;

export const createLoansGraphQLContext = createMoneyGraphQLContext;
export const createInvestmentGraphQLContext = createMoneyGraphQLContext;

export const requireLoansAuth = requireAuth;
export const requireLoansWorkspace = requireMoneyWorkspace;
export const requireLoansWriteWorkspace = requireMoneyWriteWorkspace;

export const requireInvestmentAuth = requireAuth;
export const requireInvestmentWorkspace = requireMoneyWorkspace;
export const requireInvestmentWriteWorkspace = requireMoneyWriteWorkspace;

export function requireLoansWriteScope(ctx: MoneyGraphQLContext): void {
  requireWriteScope(ctx);
}

export function requireInvestmentWriteScope(ctx: MoneyGraphQLContext): void {
  requireWriteScope(ctx);
}

export function parseLoansAppKey(): "money" {
  return "money";
}

export function parseInvestmentAppKey(): "money" {
  return "money";
}

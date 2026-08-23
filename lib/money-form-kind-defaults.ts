import {
  findSeedFinancialFreedomCategoryId,
  findSeedLoansCategoryId,
  findSystemAccountId,
  type MoneySystemAccountKey,
} from "@/lib/money-seed-defaults";

export const MONEY_FORM_KINDS = [
  "expense",
  "income",
  "transfer",
  "investment",
  "loan",
] as const;

export type MoneyFormKind = (typeof MONEY_FORM_KINDS)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMoneyFormKind(value: string): value is MoneyFormKind {
  return (MONEY_FORM_KINDS as readonly string[]).includes(value);
}

export function parseMoneyFormKind(
  raw: string | null | undefined,
): MoneyFormKind | null {
  if (!raw) return null;
  return isMoneyFormKind(raw) ? raw : null;
}

export function parseInstrumentId(
  raw: string | null | undefined,
): string | null {
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

export function moneyNewHref(opts?: {
  kind?: MoneyFormKind;
  instrumentId?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.kind) params.set("kind", opts.kind);
  if (opts?.instrumentId) params.set("instrumentId", opts.instrumentId);
  const q = params.toString();
  return q ? `/money/new?${q}` : "/money/new";
}

/** Categories shown for this capture kind (`null` = none, e.g. transfer). */
export function expenseCategoryKindForFormKind(
  kind: MoneyFormKind,
): "expense" | "income" | null {
  if (kind === "transfer") return null;
  if (kind === "income") return "income";
  return "expense";
}

type AccountRef = {
  id: string;
  type?: string | null;
  systemKey?: string | null;
};

type CategoryRef = {
  id: string;
  name: string;
  parentId: string | null;
};

function accountIdBySystemKeyOrType(
  accounts: readonly AccountRef[],
  systemKey: MoneySystemAccountKey,
): string | undefined {
  const byKey = findSystemAccountId(accounts, systemKey);
  if (byKey) return byKey;
  return accounts.find((a) => a.type === systemKey)?.id;
}

/** Preferred cash account when Kind is Investment or Loan. */
export function preferredAccountIdForFormKind(
  kind: MoneyFormKind,
  accounts: readonly AccountRef[],
): string | undefined {
  if (kind === "investment") {
    return accountIdBySystemKeyOrType(accounts, "investment");
  }
  if (kind === "loan") {
    return accountIdBySystemKeyOrType(accounts, "loan");
  }
  return undefined;
}

/** Preferred expense category when Kind is Investment or Loan. */
export function preferredCategoryIdForFormKind(
  kind: MoneyFormKind,
  categories: readonly CategoryRef[],
): string | undefined {
  if (kind === "investment") {
    return findSeedFinancialFreedomCategoryId(categories);
  }
  if (kind === "loan") {
    return findSeedLoansCategoryId(categories);
  }
  return undefined;
}

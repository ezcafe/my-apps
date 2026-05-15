import type { CategoryKind } from "@/lib/validators/money";

export type RuleMatch = {
  merchantId?: string;
  accountId?: string;
};

export type RuleAction = {
  setCategoryId?: string;
  tagIds?: string[];
};

export function transactionMatchesRule(
  rule: { kind: CategoryKind; match: RuleMatch },
  tx: {
    kind: string;
    merchantId?: string | null;
    accountId: string;
  },
): boolean {
  if (rule.kind !== tx.kind) return false;
  const wantsAccount = Boolean(rule.match.accountId);
  const wantsMerchant = Boolean(rule.match.merchantId);
  if (!wantsAccount && !wantsMerchant) return false;

  if (rule.match.accountId && rule.match.accountId !== tx.accountId) return false;
  if (rule.match.merchantId && rule.match.merchantId !== tx.merchantId) return false;
  return true;
}

export function applyRulesToTransaction<
  T extends {
    kind: string;
    merchantId?: string | null;
    accountId: string;
    categoryId?: string | null;
    tagIds?: string[];
  },
>(
  tx: T,
  rules: {
    kind: CategoryKind;
    priority: number;
    match: RuleMatch;
    action: RuleAction;
  }[],
): T {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  let next: T = { ...tx, tagIds: tx.tagIds ? [...tx.tagIds] : [] };

  for (const rule of sorted) {
    if (!transactionMatchesRule(rule, next)) continue;
    const a = rule.action;
    if (a.setCategoryId) {
      next = { ...next, categoryId: a.setCategoryId };
    }
    if (a.tagIds?.length) {
      const merged = new Set([...(next.tagIds ?? []), ...a.tagIds]);
      next = { ...next, tagIds: [...merged] };
    }
  }

  return next;
}

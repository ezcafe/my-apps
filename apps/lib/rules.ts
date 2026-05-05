export type RuleMatch = {
  merchantId?: string;
  accountId?: string;
};

export type RuleAction = {
  setCategoryId?: string;
  tagIds?: string[];
};

export function transactionMatchesRule(
  match: RuleMatch,
  tx: {
    merchantId?: string | null;
    accountId: string;
  },
): boolean {
  const wantsAccount = Boolean(match.accountId);
  const wantsMerchant = Boolean(match.merchantId);
  if (!wantsAccount && !wantsMerchant) return false;

  if (match.accountId && match.accountId !== tx.accountId) return false;
  if (match.merchantId && match.merchantId !== tx.merchantId) return false;
  return true;
}

export function applyRulesToTransaction<
  T extends {
    merchantId?: string | null;
    accountId: string;
    categoryId?: string | null;
    tagIds?: string[];
  },
>(
  tx: T,
  rules: { priority: number; match: RuleMatch; action: RuleAction }[],
): T {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  let next: T = { ...tx, tagIds: tx.tagIds ? [...tx.tagIds] : [] };

  for (const rule of sorted) {
    if (!transactionMatchesRule(rule.match, next)) continue;
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

export type InstrumentLedgerDefaults = {
  moneyAccountId: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
};

/** Account always; category only when P&L sign is known (profit → income, loss → expense). */
export function instrumentLedgerPrefill(
  defaults: InstrumentLedgerDefaults | null | undefined,
  pnlSign: number | null,
): { accountId?: string; categoryId?: string } {
  if (!defaults) return {};
  const accountId = defaults.moneyAccountId ?? undefined;
  if (pnlSign == null) return { accountId };
  const categoryId =
    pnlSign >= 0
      ? (defaults.incomeCategoryId ?? undefined)
      : (defaults.expenseCategoryId ?? undefined);
  return { accountId, categoryId };
}

/** Action-first empty copy for Money cold paths (empty ≠ error). */

export type MoneyColdEmptyCopy = {
  title: string;
  description: string;
};

export const MONEY_COLD_LEDGER_SPENDING_EMPTY: MoneyColdEmptyCopy = {
  title: "No spending yet",
  description: "Add a transaction, or widen the date range.",
};

export const MONEY_COLD_LEDGER_BILLS_EMPTY: MoneyColdEmptyCopy = {
  title: "No bills logged yet",
  description:
    "Add a Bills expense, or widen the date range.",
};

export const MONEY_COLD_LEDGER_SAVINGS_EMPTY: MoneyColdEmptyCopy = {
  title: "No savings activity yet",
  description: "Record a transfer, or widen the date range.",
};

export const MONEY_COLD_INSIGHTS_TRANSACTIONS_EMPTY: MoneyColdEmptyCopy = {
  title: "No transactions for this view",
  description: "Add a transaction on Spending, or widen the date range.",
};

export const MONEY_COLD_INSIGHTS_SPEND_EMPTY: MoneyColdEmptyCopy = {
  title: "No category spend in this range",
  description: "Add expenses, or adjust filters for this range.",
};

export const MONEY_COLD_FORM_EMPTY = {
  accounts: "No accounts yet. Add one under Money → Settings → Accounts.",
  categories: "No categories yet. Add one under Money → Settings → Categories.",
  merchants: "No merchants yet. Add one under Money → Settings → Merchants.",
} as const;

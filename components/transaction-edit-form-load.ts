/** Shared dynamic import for the transaction edit form (modal + page + preload). */
export const loadTransactionEditForm = () =>
  import("@/components/transaction-edit-form").then((m) => ({
    default: m.TransactionEditForm,
  }));

/** Warm the edit-form chunk before the dialog opens (hover/focus intent). */
export function preloadTransactionEditForm() {
  if (typeof window === "undefined") return;
  void loadTransactionEditForm();
}

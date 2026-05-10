"use client";

import dynamic from "next/dynamic";

const TransactionEditForm = dynamic(
  () =>
    import("@/components/transaction-edit-form").then((m) => ({
      default: m.TransactionEditForm,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted">Loading editor…</p>
    ),
  },
);

export function TransactionEditFormLazy({
  transactionId,
}: {
  transactionId: string;
}) {
  return <TransactionEditForm transactionId={transactionId} />;
}

"use client";

import dynamic from "next/dynamic";
import { loadTransactionEditForm } from "@/components/transaction-edit-form-load";

const TransactionEditForm = dynamic(loadTransactionEditForm, {
  ssr: false,
  loading: () => (
    <p className="text-sm text-muted">Loading editor…</p>
  ),
});

export function TransactionEditFormLazy({
  transactionId,
  returnTo,
}: {
  transactionId: string;
  returnTo?: string | null;
}) {
  return (
    <TransactionEditForm transactionId={transactionId} returnTo={returnTo} />
  );
}

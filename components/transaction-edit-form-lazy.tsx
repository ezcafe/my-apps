"use client";

import dynamic from "next/dynamic";
import { loadTransactionEditForm } from "@/components/transaction-edit-form-load";
import { Skeleton } from "@/components/ui/skeleton";

const TransactionEditForm = dynamic(loadTransactionEditForm, {
  ssr: false,
  loading: () => (
    <div className="min-w-0 max-w-4xl space-y-4">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-10 rounded-[var(--radius-sm)]" />
      </header>
      <div className="grid gap-4">
        <Skeleton className="h-12 w-full max-w-xs rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-12 w-36 rounded-[var(--radius-md)]" />
          <Skeleton className="h-12 w-24 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
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

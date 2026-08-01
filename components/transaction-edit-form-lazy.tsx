"use client";

import dynamic from "next/dynamic";
import { loadTransactionEditForm } from "@/components/transaction-edit-form-load";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TransactionEditForm = dynamic(loadTransactionEditForm, {
  ssr: false,
  loading: () => (
    <Card className="max-w-4xl p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-3 w-10 rounded-[var(--radius-sm)]" />
      </header>
      <div className="grid gap-4">
        <Skeleton className="h-10 w-full max-w-xs rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-20 w-full rounded-[var(--radius-md)]" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-24 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </Card>
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

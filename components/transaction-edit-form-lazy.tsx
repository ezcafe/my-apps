"use client";

import dynamic from "next/dynamic";
import { loadTransactionEditForm } from "@/components/transaction-edit-form-load";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TransactionEditForm = dynamic(loadTransactionEditForm, {
  ssr: false,
  loading: () => (
    <Card className="max-w-4xl space-y-3 p-5">
      <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
      <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
      <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
      <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
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

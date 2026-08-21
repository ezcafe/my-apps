"use client";

import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  loadTransactionEditForm,
  preloadTransactionEditForm,
} from "@/components/transaction-edit-form-load";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { moneyFormLookupsQueryOptions } from "@/lib/money-query-options";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";

const TransactionEditForm = dynamic(loadTransactionEditForm, {
  ssr: false,
  loading: () => (
    <div className="space-y-4 p-1">
      <header className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-6 w-40 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-4 w-10 rounded-[var(--radius-sm)]" />
      </header>
      <Skeleton className="h-12 w-full max-w-xs rounded-[var(--radius-md)]" />
      <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      <Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-12 w-36 rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-24 rounded-[var(--radius-md)]" />
      </div>
    </div>
  ),
});

export function TransactionEditModal({
  open,
  transactionId,
  onClose,
  onSaved,
}: {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const { workspaceReady } = useWorkspaceCurrency();
  const labelledBy = "transaction-edit-modal-title";

  useEffect(() => {
    if (!workspaceReady) return;
    void queryClient.prefetchQuery(moneyFormLookupsQueryOptions());
    preloadTransactionEditForm();
  }, [queryClient, workspaceReady]);

  return (
    <Modal
      open={open && transactionId != null}
      onClose={onClose}
      bare
      labelledBy={labelledBy}
      className="w-[min(100vw-2rem,72rem)] max-h-[calc(100dvh-2rem)] p-0"
    >
      {transactionId ? (
        <div className="px-4 py-4">
          <h2 id={labelledBy} className="sr-only">
            Edit transaction
          </h2>
          <TransactionEditForm
            transactionId={transactionId}
            variant="modal"
            onClose={onClose}
            onSaved={onSaved}
          />
        </div>
      ) : null}
    </Modal>
  );
}

"use client";

import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/modal";

const TransactionEditForm = dynamic(
  () =>
    import("@/components/transaction-edit-form").then((m) => ({
      default: m.TransactionEditForm,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-6 text-sm text-muted">Loading editor…</p>
    ),
  },
);

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
  const labelledBy = "transaction-edit-modal-title";

  return (
    <Modal
      open={open && transactionId != null}
      onClose={onClose}
      bare
      labelledBy={labelledBy}
      className="w-[min(100vw-2rem,72rem)] max-h-[calc(100dvh-2rem)] overflow-hidden p-0"
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

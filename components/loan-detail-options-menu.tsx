"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHeaderActionsSetter } from "@/components/app-header-override";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MoreMenu, MoreMenuItem } from "@/components/ui/more-menu";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_CANCEL_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";

/**
 * Loan detail More menu: Edit + Delete in the page heading actions slot.
 * Owns the delete confirm modal.
 */
export function LoanDetailOptionsMenu({
  loanId,
  loanName,
  status,
}: {
  loanId: string;
  loanName: string;
  status: string;
}) {
  const router = useRouter();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const setActions = useHeaderActionsSetter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = status !== "cancelled";

  useLayoutEffect(() => {
    if (!setActions) return;
    if (!canManage) {
      setActions(null);
      return () => setActions(null);
    }
    setActions(
      <MoreMenu aria-label="Loan options">
        <MoreMenuItem
          onClick={() => {
            router.push(`/loans/${loanId}/edit`);
          }}
        >
          Edit loan
        </MoreMenuItem>
        <MoreMenuItem variant="danger" onClick={() => setConfirmOpen(true)}>
          Delete loan
        </MoreMenuItem>
      </MoreMenu>,
    );
    return () => setActions(null);
  }, [setActions, canManage, loanId, router]);

  if (!canManage) {
    return null;
  }

  async function deleteLoan() {
    setDeleting(true);
    try {
      await loansGraphQLRequest(LOAN_CANCEL_MUTATION, { id: loanId });
      await queryClient.invalidateQueries({ queryKey: loansKeys.all });
      notify.success("Loan deleted", `${loanName} was removed from your overview.`);
      setConfirmOpen(false);
      router.push("/loans");
    } catch (e) {
      notify.error(
        "Could not delete loan",
        toUserFacingMessage(e),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title="Delete loan?"
    >
      <p className="mb-4 text-sm text-muted">
        <span className="font-medium text-foreground">{loanName}</span> will be
        removed from your loans overview. Payment history is kept but the loan
        cannot be restored to active.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          onClick={() => void deleteLoan()}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete loan"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirmOpen(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

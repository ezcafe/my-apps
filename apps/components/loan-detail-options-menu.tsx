"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MoreMenu, MoreMenuItem } from "@/components/ui/more-menu";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_CANCEL_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status === "cancelled") {
    return null;
  }

  async function deleteLoan() {
    setDeleting(true);
    try {
      await loansGraphQLRequest(LOAN_CANCEL_MUTATION, { id: loanId });
      await queryClient.invalidateQueries({ queryKey: loansKeys.all });
      notify.success("Loan deleted", `${loanName} was removed from your overview.`);
      setConfirmOpen(false);
      setMenuOpen(false);
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
    <>
      <MoreMenu
        aria-label="Loan options"
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <MoreMenuItem
          variant="danger"
          onClick={() => {
            setMenuOpen(false);
            setConfirmOpen(true);
          }}
        >
          Delete loan
        </MoreMenuItem>
      </MoreMenu>

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
    </>
  );
}

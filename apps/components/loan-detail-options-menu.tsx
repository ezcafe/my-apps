"use client";

import { presentClientError, queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useState, type SVGProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Popover } from "@/components/ui/popover";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_CANCEL_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";

function IconEllipsisVertical(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

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
      <Popover
        align="end"
        aria-label="Loan options"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        trigger={<IconEllipsisVertical className="size-5" />}
        triggerClassName="fx-hit-40 size-10 shrink-0 p-0"
        className="min-w-[12rem] p-1.5"
      >
        <button
          type="button"
          className="flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-[var(--destructive-muted-text)] transition-colors duration-200 hover:bg-[var(--destructive-muted-bg)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => {
            setMenuOpen(false);
            setConfirmOpen(true);
          }}
        >
          Delete loan
        </button>
      </Popover>

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

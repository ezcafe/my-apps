"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MoreMenu, MoreMenuItem } from "@/components/ui/more-menu";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_INSTALLMENT_MARK_PAID_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";

const LoanPayModal = dynamic(
  () =>
    import("@/components/loan-pay-modal").then((m) => ({
      default: m.LoanPayModal,
    })),
  { ssr: false },
);

export function LoanPayActions({
  scheduleInstallmentId,
  loanName,
  installmentNumber,
  paymentMinor,
  currency,
  moneyAccountId,
  moneyCategoryId,
  variant = "full",
}: {
  scheduleInstallmentId: string;
  loanName: string;
  installmentNumber: number;
  paymentMinor: number;
  currency: string;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
  /** `compact` for list/due rows; `full` for loan detail. */
  variant?: "full" | "compact";
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const compact = variant === "compact";

  async function markPaidWithoutTransaction() {
    setMarking(true);
    try {
      await loansGraphQLRequest(LOAN_INSTALLMENT_MARK_PAID_MUTATION, {
        input: { scheduleInstallmentId },
      });
      await queryClient.invalidateQueries({ queryKey: loansKeys.all });
      notify.success("Marked paid", "No Money transaction was created.");
      setConfirmOpen(false);
    } catch (e) {
      notify.error("Could not update", toUserFacingMessage(e));
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size={compact ? "sm" : undefined}
          variant={compact ? "secondary" : undefined}
          onClick={() => setPayOpen(true)}
        >
          {compact ? "Pay" : "Add payment to Money"}
        </Button>
        <MoreMenu
          aria-label="More payment options"
          open={menuOpen}
          onOpenChange={setMenuOpen}
        >
          <MoreMenuItem
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            Mark paid (no transaction)
          </MoreMenuItem>
        </MoreMenu>
      </div>

      {payOpen ? (
        <LoanPayModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          scheduleInstallmentId={scheduleInstallmentId}
          loanName={loanName}
          installmentNumber={installmentNumber}
          paymentMinor={paymentMinor}
          currency={currency}
          defaultAccountId={moneyAccountId}
          defaultCategoryId={moneyCategoryId}
        />
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Mark paid without transaction?"
      >
        <p className="mb-4 text-sm text-muted">
          This updates loan progress only. Nothing is posted to Money.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={markPaidWithoutTransaction}
            disabled={marking}
          >
            {marking ? "Saving…" : "Confirm"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}

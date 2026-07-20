"use client";

import { presentClientError, queryErrorMessage, toUserFacingMessage } from "@/lib/user-facing-error";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoanPayModal } from "@/components/loan-pay-modal";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_INSTALLMENT_MARK_PAID_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";

export function LoanPayActions({
  scheduleInstallmentId,
  loanName,
  installmentNumber,
  paymentMinor,
  currency,
  moneyAccountId,
  moneyCategoryId,
}: {
  scheduleInstallmentId: string;
  loanName: string;
  installmentNumber: number;
  paymentMinor: number;
  currency: string;
  moneyAccountId: string | null;
  moneyCategoryId: string | null;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);

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
      notify.error(
        "Could not update",
        toUserFacingMessage(e),
      );
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setPayOpen(true)}>
          Add payment to Money
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirmOpen(true)}
        >
          Mark paid (no transaction)
        </Button>
      </div>

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

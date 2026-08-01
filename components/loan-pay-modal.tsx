"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Modal } from "@/components/ui/modal";
import {
  formatMinor,
  getCurrencySymbol,
  minorToMajorInput,
  parseMajorToMinor,
} from "@/lib/format-money";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_INSTALLMENT_PAY_MUTATION } from "@/lib/loans-gql-documents";
import { loansKeys } from "@/lib/loans-query-options";
import { invalidateMoneyWorkspaceQueries } from "@/lib/money-query-options";
import { findSystemAccountId } from "@/lib/money-seed-defaults";
import { moneyBootstrapQueryOptions } from "@/lib/money-query-options";
import { moneyCategoryLabel, moneyCategoryById } from "@/lib/money-category-ui";

export function LoanPayModal({
  open,
  onClose,
  scheduleInstallmentId,
  loanName,
  installmentNumber,
  paymentMinor,
  currency,
  defaultAccountId,
  defaultCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  scheduleInstallmentId: string;
  loanName: string;
  installmentNumber: number;
  paymentMinor: number;
  currency: string;
  defaultAccountId: string | null;
  defaultCategoryId: string | null;
}) {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const moneyBootstrap = useQuery(moneyBootstrapQueryOptions());
  const accounts = useMemo(
    () => moneyBootstrap.data?.accounts ?? [],
    [moneyBootstrap.data?.accounts],
  );
  const categories = useMemo(
    () =>
      moneyBootstrap.data?.categories.filter((c) => c.kind === "expense") ?? [],
    [moneyBootstrap.data?.categories],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(categories),
    [categories],
  );
  const accountQuickItems = useMemo(
    () => accounts.map((a) => ({ id: a.id, label: a.name, usageCount: 0 })),
    [accounts],
  );
  const categoryQuickItems = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: moneyCategoryLabel(c, categoryById),
        usageCount: 0,
      })),
    [categories, categoryById],
  );

  const resolvedDefaultAccountId = useMemo(() => {
    const loansAccountId = findSystemAccountId(accounts, "loan");
    if (loansAccountId) return loansAccountId;
    if (
      defaultAccountId &&
      accounts.some((account) => account.id === defaultAccountId)
    ) {
      return defaultAccountId;
    }
    return defaultAccountId ?? "";
  }, [accounts, defaultAccountId]);

  const syncKey = open
    ? [
        scheduleInstallmentId,
        resolvedDefaultAccountId,
        defaultCategoryId ?? "",
        String(paymentMinor),
        currency,
        loanName,
        String(installmentNumber),
      ].join("|")
    : null;

  const [formKey, setFormKey] = useState(syncKey);
  const [accountId, setAccountId] = useState(resolvedDefaultAccountId);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [amountMajor, setAmountMajor] = useState(() =>
    minorToMajorInput(paymentMinor, currency),
  );
  const [notes, setNotes] = useState(`Loan: ${loanName} #${installmentNumber}`);
  const [saving, setSaving] = useState(false);

  if (open && syncKey !== formKey) {
    setFormKey(syncKey);
    setAccountId(resolvedDefaultAccountId);
    setCategoryId(defaultCategoryId ?? "");
    setAmountMajor(minorToMajorInput(paymentMinor, currency));
    setNotes(`Loan: ${loanName} #${installmentNumber}`);
    setSaving(false);
  }

  async function onPay() {
    const moneyWorkspaceId = moneyBootstrap.data?.workspaceId;
    if (!moneyWorkspaceId) {
      notify.error("Money workspace unavailable", "Open /money and set up first.");
      return;
    }
    if (!accountId) {
      notify.error("Select an account");
      return;
    }
    const amountMinor = parseMajorToMinor(amountMajor.trim(), currency);
    if (amountMinor == null || amountMinor <= 0) {
      notify.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await loansGraphQLRequest(LOAN_INSTALLMENT_PAY_MUTATION, {
        input: {
          scheduleInstallmentId,
          moneyWorkspaceId,
          accountId,
          categoryId: categoryId || null,
          notes,
          amountMinor,
        },
      });
      await queryClient.invalidateQueries({ queryKey: loansKeys.all });
      await invalidateMoneyWorkspaceQueries(queryClient);
      notify.success("Payment recorded in Money");
      onClose();
    } catch (e) {
      notify.error(
        "Payment failed",
        toUserFacingMessage(e),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add payment to Money">
      <p className="mb-4 text-sm text-muted">
        {loanName} · installment #{installmentNumber} · scheduled{" "}
        {formatMinor(paymentMinor, currency)}
      </p>
      <div className="space-y-4">
        <Field label="Amount" required>
          <InputGroup>
            <InputGroupAddon side="leading" aria-hidden>
              {getCurrencySymbol(currency)}
            </InputGroupAddon>
            <InputGroupInput
              value={amountMajor}
              onChange={(e) => setAmountMajor(e.target.value)}
              inputMode="decimal"
              placeholder={currency === "VND" ? "0" : "0.00"}
              required
              aria-label="Payment amount"
            />
            <InputGroupAddon side="trailing" aria-hidden>
              {currency}
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <MoneyUsageQuickPick
          legend="Account"
          ariaLabel="Account"
          items={accountQuickItems}
          selectedId={accountId}
          onSelect={setAccountId}
          otherLabel="Other account"
          emptyMessage="No accounts yet."
        />
        <MoneyUsageQuickPick
          legend="Category"
          ariaLabel="Category"
          items={categoryQuickItems}
          selectedId={categoryId}
          onSelect={setCategoryId}
          otherLabel="Select other category"
          allowEmpty
          emptyLabel="—"
          emptyMessage="No categories yet."
        />
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onPay} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";
import {
  localDateString,
  MoneyDateQuickPick,
} from "@/components/money-date-quick-pick";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatMinor, parseMajorToMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  buildAmortizationSchedule,
  computeFirstMonthInterestMinor,
  computeMonthlyPaymentMinor,
} from "@/lib/loans-amortization";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import { LOAN_CREATE_MUTATION } from "@/lib/loans-gql-documents";
import { moneyBootstrapQueryOptions } from "@/lib/money-query-options";
import { moneyCategoryById, moneyCategoryLabel } from "@/lib/money-category-ui";

function formatLtvPercent(principalMinor: number, collateralMinor: number): string {
  const pct = (principalMinor / collateralMinor) * 100;
  if (Number.isNaN(pct)) return "—";
  const rounded = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
  return `${rounded}%`;
}

export function LoanCreateForm() {
  const router = useRouter();
  const notify = useNotify();
  const { formatDate } = useFormatDate();
  const { defaultCurrency, workspaceReady } = useLoansWorkspace();
  const moneyBootstrap = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: workspaceReady,
  });

  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [collateral, setCollateral] = useState("");
  const [ratePercent, setRatePercent] = useState("5.25");
  const [termMonths, setTermMonths] = useState("300");
  const [initialRateMonths, setInitialRateMonths] = useState("");
  const [rateAfterInitialPercent, setRateAfterInitialPercent] = useState("");
  const [startDate, setStartDate] = useState(localDateString());
  const [dueDay, setDueDay] = useState("25");
  const [useCustomPayment, setUseCustomPayment] = useState(false);
  const [customPayment, setCustomPayment] = useState("");
  const [useCustomPaymentAfterRateChange, setUseCustomPaymentAfterRateChange] =
    useState(false);
  const [customPaymentAfterRateChange, setCustomPaymentAfterRateChange] =
    useState("");
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [moneyAccountId, setMoneyAccountId] = useState("");
  const [moneyCategoryId, setMoneyCategoryId] = useState("");
  const [autoMarkPastDuePaid, setAutoMarkPastDuePaid] = useState(false);
  const [autoMarkPastDueWithoutTransaction, setAutoMarkPastDueWithoutTransaction] =
    useState(true);
  const [saving, setSaving] = useState(false);

  const accounts = moneyBootstrap.data?.accounts;
  const categories = moneyBootstrap.data?.categories;
  const expenseCategories = useMemo(
    () => categories?.filter((c) => c.kind === "expense") ?? [],
    [categories],
  );
  const categoryById = useMemo(
    () => moneyCategoryById(expenseCategories),
    [expenseCategories],
  );
  const accountQuickItems = useMemo(
    () => [
      { id: "", label: "—", usageCount: 1_000_000 },
      ...(accounts ?? []).map((a) => ({
        id: a.id,
        label: a.name,
        usageCount: 0,
      })),
    ],
    [accounts],
  );
  const categoryQuickItems = useMemo(
    () => [
      { id: "", label: "—", usageCount: 1_000_000 },
      ...expenseCategories.map((c) => ({
        id: c.id,
        label: moneyCategoryLabel(c, categoryById),
        usageCount: 0,
      })),
    ],
    [expenseCategories, categoryById],
  );

  const parsedInputs = useMemo(() => {
    const principalMinor = parseMajorToMinor(principal, defaultCurrency);
    const collateralMinor = parseMajorToMinor(collateral, defaultCurrency);
    const term = Number(termMonths);
    const rateBps = Math.round(parseFloat(ratePercent) * 100);
    const dueDayNum = Number(dueDay);
    const initialRateMonthsNum =
      initialRateMonths.trim() === "" ? null : Number(initialRateMonths);
    const rateAfterInitialBps =
      rateAfterInitialPercent.trim() === ""
        ? null
        : Math.round(parseFloat(rateAfterInitialPercent) * 100);

    if (
      principalMinor == null ||
      principalMinor <= 0 ||
      !Number.isFinite(term) ||
      term <= 0 ||
      !Number.isFinite(rateBps) ||
      rateBps < 0 ||
      !Number.isFinite(dueDayNum) ||
      dueDayNum < 1 ||
      dueDayNum > 28 ||
      (initialRateMonthsNum != null &&
        (!Number.isFinite(initialRateMonthsNum) ||
          initialRateMonthsNum <= 0 ||
          initialRateMonthsNum > term)) ||
      (rateAfterInitialPercent.trim() !== "" &&
        (rateAfterInitialBps == null ||
          !Number.isFinite(rateAfterInitialBps) ||
          rateAfterInitialBps < 0))
    ) {
      return null;
    }

    const hasRateChange =
      initialRateMonthsNum != null &&
      initialRateMonthsNum > 0 &&
      initialRateMonthsNum < term;

    if (hasRateChange && rateAfterInitialBps == null) {
      return null;
    }

    return {
      principalMinor,
      collateralMinor,
      term,
      rateBps,
      dueDayNum,
      initialRateMonths: hasRateChange ? initialRateMonthsNum : null,
      rateAfterInitialBps: hasRateChange ? rateAfterInitialBps : null,
    };
  }, [
    principal,
    collateral,
    ratePercent,
    termMonths,
    initialRateMonths,
    rateAfterInitialPercent,
    dueDay,
    defaultCurrency,
  ]);

  const scheduleInput = useMemo(() => {
    if (!parsedInputs) return null;
    const customMinor = useCustomPayment
      ? parseMajorToMinor(customPayment, defaultCurrency)
      : null;
    const customAfterRateChangeMinor = useCustomPaymentAfterRateChange
      ? parseMajorToMinor(customPaymentAfterRateChange, defaultCurrency)
      : null;
    return {
      principalMinor: parsedInputs.principalMinor,
      annualRateBps: parsedInputs.rateBps,
      termMonths: parsedInputs.term,
      startDate,
      dueDayOfMonth: parsedInputs.dueDayNum,
      initialRateMonths: parsedInputs.initialRateMonths,
      rateAfterInitialBps: parsedInputs.rateAfterInitialBps,
      ...(useCustomPayment && customMinor != null && customMinor > 0
        ? { paymentMinor: customMinor }
        : {}),
      ...(useCustomPaymentAfterRateChange &&
      customAfterRateChangeMinor != null &&
      customAfterRateChangeMinor > 0
        ? { paymentAfterRateChangeMinor: customAfterRateChangeMinor }
        : {}),
    };
  }, [
    parsedInputs,
    startDate,
    useCustomPayment,
    customPayment,
    useCustomPaymentAfterRateChange,
    customPaymentAfterRateChange,
    defaultCurrency,
  ]);

  const computedPaymentMinor = useMemo(() => {
    if (!parsedInputs) return null;
    try {
      return computeMonthlyPaymentMinor(
        parsedInputs.principalMinor,
        parsedInputs.rateBps,
        parsedInputs.term,
      );
    } catch {
      return null;
    }
  }, [parsedInputs]);

  const firstMonthInterestMinor = useMemo(() => {
    if (!parsedInputs) return null;
    try {
      return computeFirstMonthInterestMinor(
        parsedInputs.principalMinor,
        parsedInputs.rateBps,
        startDate,
        parsedInputs.dueDayNum,
      );
    } catch {
      return null;
    }
  }, [parsedInputs, startDate]);

  const schedulePreview = useMemo(() => {
    if (!scheduleInput || computedPaymentMinor == null) return null;
    try {
      return buildAmortizationSchedule(scheduleInput);
    } catch {
      return null;
    }
  }, [scheduleInput, computedPaymentMinor]);

  const ltvLabel = useMemo(() => {
    if (
      !parsedInputs?.collateralMinor ||
      parsedInputs.collateralMinor <= 0
    ) {
      return null;
    }
    return formatLtvPercent(
      parsedInputs.principalMinor,
      parsedInputs.collateralMinor,
    );
  }, [parsedInputs]);

  const downPaymentMinor = useMemo(() => {
    if (
      !parsedInputs?.collateralMinor ||
      parsedInputs.collateralMinor <= 0
    ) {
      return null;
    }
    return Math.max(0, parsedInputs.collateralMinor - parsedInputs.principalMinor);
  }, [parsedInputs]);

  const pastDueCount = useMemo(() => {
    if (!schedulePreview) return 0;
    const today = localDateString();
    return schedulePreview.filter((row) => row.dueDate <= today).length;
  }, [schedulePreview]);

  const needsMoneyAccountForAutoMark =
    autoMarkPastDuePaid &&
    !autoMarkPastDueWithoutTransaction &&
    (!moneyAccountId || !moneyBootstrap.data?.workspaceId);

  const firstMonthPrincipalMinor = useMemo(() => {
    if (computedPaymentMinor == null || firstMonthInterestMinor == null) {
      return null;
    }
    return computedPaymentMinor - firstMonthInterestMinor;
  }, [computedPaymentMinor, firstMonthInterestMinor]);

  const hasRateChangeConfigured =
    parsedInputs?.initialRateMonths != null &&
    parsedInputs.rateAfterInitialBps != null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const principalMinor = parseMajorToMinor(principal, defaultCurrency);
      if (principalMinor == null || principalMinor <= 0) {
        throw new Error("Enter a valid principal amount");
      }
      const annualRateBps = Math.round(parseFloat(ratePercent) * 100);
      let paymentMinor: number | undefined;
      if (useCustomPayment) {
        paymentMinor = parseMajorToMinor(customPayment, defaultCurrency) ?? undefined;
        if (paymentMinor == null || paymentMinor <= 0) {
          throw new Error("Enter a valid custom monthly payment");
        }
      }
      let paymentAfterRateChangeMinor: number | undefined;
      if (useCustomPaymentAfterRateChange) {
        paymentAfterRateChangeMinor =
          parseMajorToMinor(customPaymentAfterRateChange, defaultCurrency) ??
          undefined;
        if (
          paymentAfterRateChangeMinor == null ||
          paymentAfterRateChangeMinor <= 0
        ) {
          throw new Error("Enter a valid payment after rate change");
        }
      }
      const collateralMinor = parseMajorToMinor(collateral, defaultCurrency);
      const term = Number(termMonths);
      const initialRateMonthsNum =
        initialRateMonths.trim() === "" ? null : Number(initialRateMonths);
      const rateAfterInitialBps =
        rateAfterInitialPercent.trim() === ""
          ? null
          : Math.round(parseFloat(rateAfterInitialPercent) * 100);

      const result = await loansGraphQLRequest<{
        loanCreate: { id: string };
      }>(LOAN_CREATE_MUTATION, {
        input: {
          name: name.trim(),
          principalMinor,
          annualRateBps,
          termMonths: term,
          startDate,
          dueDayOfMonth: Number(dueDay),
          ...(paymentMinor != null ? { paymentMinor } : {}),
          ...(initialRateMonthsNum != null &&
          initialRateMonthsNum > 0 &&
          initialRateMonthsNum < term
            ? {
                initialRateMonths: initialRateMonthsNum,
                rateAfterInitialBps,
              }
            : {}),
          ...(paymentAfterRateChangeMinor != null
            ? { paymentAfterRateChangeMinor }
            : {}),
          ...(collateralMinor != null && collateralMinor > 0
            ? { collateralValueMinor: collateralMinor }
            : {}),
          moneyWorkspaceId: moneyBootstrap.data?.workspaceId ?? null,
          moneyAccountId: moneyAccountId || null,
          moneyCategoryId: moneyCategoryId || null,
          ...(pastDueCount > 0 && autoMarkPastDuePaid
            ? {
                autoMarkPastDuePaid: true,
                autoMarkPastDueWithoutTransaction,
              }
            : {}),
        },
      });
      notify.success("Loan created");
      router.push(`/money/loans/${result.loanCreate.id}`);
    } catch (err) {
      notify.error(
        "Could not create loan",
        toUserFacingMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
      <Card className="p-4">
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Loan name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Field label={`Principal (${defaultCurrency})`}>
              <Input
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="Annual rate (%)">
              <Input
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="Term (months)">
              <Input
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                inputMode="numeric"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Field label="Initial fixed-rate period (months)">
              <Input
                value={initialRateMonths}
                onChange={(e) => setInitialRateMonths(e.target.value)}
                inputMode="numeric"
                placeholder="Optional — full term if empty"
              />
            </Field>
            <Field label="Rate after initial period (%)">
              <Input
                value={rateAfterInitialPercent}
                onChange={(e) => setRateAfterInitialPercent(e.target.value)}
                inputMode="decimal"
                placeholder={
                  initialRateMonths.trim() ? "Required when period < term" : "Optional"
                }
                disabled={initialRateMonths.trim() === ""}
              />
            </Field>
          </div>

          {parsedInputs == null ? (
            <p className="text-xs text-muted">
              Enter principal, rate, and term to see your estimated monthly
              payment.
            </p>
          ) : null}

          {computedPaymentMinor != null ? (
            <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
              <p className="text-sm font-medium text-foreground">
                Estimated monthly payment
              </p>
              <div className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
                <div>
                  <p className="text-xs text-muted">Monthly payment</p>
                  <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                    {formatMinor(computedPaymentMinor, defaultCurrency)}
                  </p>
                </div>
                {firstMonthInterestMinor != null ? (
                  <div>
                    <p className="text-xs text-muted">First-month interest</p>
                    <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                      {formatMinor(firstMonthInterestMinor, defaultCurrency)}
                    </p>
                  </div>
                ) : null}
                {firstMonthPrincipalMinor != null ? (
                  <div>
                    <p className="text-xs text-muted">First-month principal</p>
                    <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                      {formatMinor(firstMonthPrincipalMinor, defaultCurrency)}
                    </p>
                  </div>
                ) : null}
              </div>
              {schedulePreview != null && schedulePreview.length > 0 ? (
                <div className="mt-4">
                  <button
                    type="button"
                    className="text-xs font-medium text-accent transition-colors duration-150 hover:text-foreground"
                    onClick={() => setShowSchedulePreview((v) => !v)}
                  >
                    {showSchedulePreview ? "Hide" : "Show"} schedule preview
                  </button>
                  {showSchedulePreview ? (
                    <div className="mt-2 overflow-x-auto rounded-[var(--radius-md)] border border-border">
                      <table className="min-w-full divide-y divide-border text-left text-sm">
                        <caption className="sr-only">
                          Amortization schedule preview
                        </caption>
                        <thead className="bg-muted-surface">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-medium">
                              #
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">
                              Due date
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 font-medium text-right"
                            >
                              Payment
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 font-medium text-right"
                            >
                              Interest
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 font-medium text-right"
                            >
                              Principal
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 font-medium text-right"
                            >
                              Balance after
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {schedulePreview.slice(0, 6).map((row) => (
                            <tr
                              key={row.installmentNumber}
                              className="transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                            >
                              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                                {row.installmentNumber}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted">
                                {formatDate(row.dueDate, {
                                  omitYearIfCurrent: true,
                                })}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                                {formatMinor(row.paymentMinor, defaultCurrency)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted">
                                {formatMinor(row.interestMinor, defaultCurrency)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                                {formatMinor(row.principalMinor, defaultCurrency)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted">
                                {formatMinor(
                                  row.balanceAfterMinor,
                                  defaultCurrency,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {schedulePreview.length > 6 ? (
                        <p className="border-t border-border px-3 py-2 text-xs text-muted">
                          Showing first 6 of {schedulePreview.length}{" "}
                          installments
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <Field label={`Collateral value (${defaultCurrency})`}>
            <Input
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              inputMode="decimal"
              placeholder="Optional"
            />
          </Field>

          {ltvLabel != null ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
              <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 px-3 py-2">
                <p className="text-xs text-muted">LTV ratio</p>
                <p className="mt-0.5 text-sm font-medium tabular-nums">{ltvLabel}</p>
              </div>
              {downPaymentMinor != null ? (
                <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 px-3 py-2">
                  <p className="text-xs text-muted">Down payment</p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums">
                    {formatMinor(downPaymentMinor, defaultCurrency)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <MoneyDateQuickPick
              legend="Start date"
              ariaLabel="Start date"
              required
              value={startDate}
              onChange={setStartDate}
            />
            <Field label="Due day of month (1–28)">
              <Input
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                inputMode="numeric"
                min={1}
                max={28}
                required
              />
            </Field>
          </div>

          {pastDueCount > 0 ? (
            <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={autoMarkPastDuePaid}
                  onChange={() => setAutoMarkPastDuePaid((v) => !v)}
                  ariaLabel="Mark past-due installments as paid"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">
                    Mark past-due installments as paid
                  </span>
                  <p className="mt-0.5 text-xs text-muted">
                    {pastDueCount} installment{pastDueCount === 1 ? "" : "s"}{" "}
                    with a due date on or before today.
                  </p>
                  {autoMarkPastDuePaid ? (
                    <div className="mt-3 flex items-start gap-2">
                      <Checkbox
                        checked={autoMarkPastDueWithoutTransaction}
                        onChange={() =>
                          setAutoMarkPastDueWithoutTransaction((v) => !v)
                        }
                        ariaLabel="Mark paid without Money transaction"
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-foreground">
                          Paid without Money transaction
                        </span>
                        <p className="mt-0.5 text-xs text-muted">
                          Updates loan progress only. Uncheck to create an
                          expense in Money for each past-due installment
                          (requires account below).
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={useCustomPayment}
                onChange={() => setUseCustomPayment((v) => !v)}
                ariaLabel="Use custom monthly payment"
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">
                  Custom monthly payment
                </span>
                <p className="mt-0.5 text-xs text-muted">
                  {computedPaymentMinor != null
                    ? `Calculated payment: ${formatMinor(computedPaymentMinor, defaultCurrency)}`
                    : "Enter principal, rate, and term to see the calculated payment."}
                </p>
                {useCustomPayment ? (
                  <Field label={`Monthly payment (${defaultCurrency})`} className="mt-3">
                    <Input
                      value={customPayment}
                      onChange={(e) => setCustomPayment(e.target.value)}
                      inputMode="decimal"
                      required
                    />
                  </Field>
                ) : null}
              </div>
            </div>
          </div>

          {hasRateChangeConfigured ? (
            <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={useCustomPaymentAfterRateChange}
                  onChange={() => setUseCustomPaymentAfterRateChange((v) => !v)}
                  ariaLabel="Use custom payment after rate change"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">
                    Custom payment after rate change
                  </span>
                  <p className="mt-0.5 text-xs text-muted">
                    From month {parsedInputs!.initialRateMonths! + 1}, payment
                    recalculates via PMT on the remaining balance unless you
                    override it here.
                  </p>
                  {useCustomPaymentAfterRateChange ? (
                    <Field
                      label={`Payment after rate change (${defaultCurrency})`}
                      className="mt-3"
                    >
                      <Input
                        value={customPaymentAfterRateChange}
                        onChange={(e) =>
                          setCustomPaymentAfterRateChange(e.target.value)
                        }
                        inputMode="decimal"
                        required
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
            <p className="text-sm text-muted">
              Optional: link payments to your Money workspace (
              {moneyBootstrap.data?.workspaceId
                ? "connected"
                : "open /money to set up"}
              ).
            </p>
            <div className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              <MoneyUsageQuickPick
                legend="Pay from account"
                ariaLabel="Pay from account"
                items={accountQuickItems}
                selectedId={moneyAccountId}
                onSelect={setMoneyAccountId}
                otherLabel="Other account"
                emptyMessage="No accounts yet."
              />
              <MoneyUsageQuickPick
                legend="Category"
                ariaLabel="Category"
                items={categoryQuickItems}
                selectedId={moneyCategoryId}
                onSelect={setMoneyCategoryId}
                otherLabel="Select other category"
                emptyMessage="No categories yet."
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving || needsMoneyAccountForAutoMark}
          >
            {saving ? "Creating…" : "Create loan"}
          </Button>
          {needsMoneyAccountForAutoMark ? (
            <p className="text-xs text-muted">
              {!moneyBootstrap.data?.workspaceId
                ? "Open /money to set up a workspace before creating transactions for past-due installments."
                : "Select a pay-from account to create Money transactions for past-due installments."}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

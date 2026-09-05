"use client";

import { toUserFacingMessage } from "@/lib/user-facing-error";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotify } from "@/components/notification-provider";
import { useLoansWorkspace } from "@/components/loans-workspace-provider";
import {
  localDateString,
  MoneyDateQuickPick,
} from "@/components/money-date-quick-pick";
import { MoneyUsageQuickPick } from "@/components/money-usage-quick-pick";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMinor, minorToMajorInput, parseMajorToMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  buildAmortizationSchedule,
  computeFirstMonthInterestMinor,
  computeMonthlyPaymentMinor,
} from "@/lib/loans-amortization";
import { loansGraphQLRequest } from "@/lib/loans-gql-client";
import {
  LOAN_CREATE_MUTATION,
  LOAN_UPDATE_MUTATION,
} from "@/lib/loans-gql-documents";
import {
  loansKeys,
  type LoanDetail,
} from "@/lib/loans-query-options";
import { moneyBootstrapQueryOptions } from "@/lib/money-query-options";
import { moneyCategoryById, moneyCategoryLabel } from "@/lib/money-category-ui";
function formatLtvPercent(principalMinor: number, collateralMinor: number): string {
  const pct = (principalMinor / collateralMinor) * 100;
  if (Number.isNaN(pct)) return "—";
  const rounded = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
  return `${rounded}%`;
}

export function LoanCreateForm({
  mode = "create",
  initial,
}: {
  mode?: "create" | "edit";
  /** Required when `mode` is `"edit"`. */
  initial?: LoanDetail;
}) {
  const isEdit = mode === "edit" && initial != null;
  const router = useRouter();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { formatDate } = useFormatDate();
  const { defaultCurrency, workspaceReady } = useLoansWorkspace();
  const moneyBootstrap = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: workspaceReady,
  });

  const currency = isEdit ? initial.currency : defaultCurrency;

  const [name, setName] = useState(() => initial?.name ?? "");
  const [principal, setPrincipal] = useState(() =>
    initial
      ? minorToMajorInput(initial.principalMinor, initial.currency)
      : "",
  );
  const [collateral, setCollateral] = useState(() =>
    initial?.collateralValueMinor != null
      ? minorToMajorInput(initial.collateralValueMinor, initial.currency)
      : "",
  );
  const [ratePercent, setRatePercent] = useState(() =>
    initial ? (initial.annualRateBps / 100).toFixed(2) : "5.25",
  );
  const [termMonths, setTermMonths] = useState(() =>
    initial ? String(initial.termMonths) : "300",
  );
  const [initialRateMonths, setInitialRateMonths] = useState(() =>
    initial?.initialRateMonths != null ? String(initial.initialRateMonths) : "",
  );
  const [rateAfterInitialPercent, setRateAfterInitialPercent] = useState(() =>
    initial?.rateAfterInitialBps != null
      ? (initial.rateAfterInitialBps / 100).toFixed(2)
      : "",
  );
  const [startDate, setStartDate] = useState(
    () => initial?.startDate ?? localDateString(),
  );
  const [dueDay, setDueDay] = useState(() =>
    initial ? String(initial.dueDayOfMonth) : "25",
  );
  const [useCustomPayment, setUseCustomPayment] = useState(
    () => initial != null && initial.paymentMinor > 0,
  );
  const [customPayment, setCustomPayment] = useState(() =>
    initial
      ? minorToMajorInput(initial.paymentMinor, initial.currency)
      : "",
  );
  const [useCustomPaymentAfterRateChange, setUseCustomPaymentAfterRateChange] =
    useState(() => initial?.paymentAfterRateChangeMinor != null);
  const [customPaymentAfterRateChange, setCustomPaymentAfterRateChange] =
    useState(() =>
      initial?.paymentAfterRateChangeMinor != null
        ? minorToMajorInput(
            initial.paymentAfterRateChangeMinor,
            initial.currency,
          )
        : "",
    );
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [moneyAccountId, setMoneyAccountId] = useState(
    () => initial?.moneyAccountId ?? "",
  );
  const [moneyCategoryId, setMoneyCategoryId] = useState(
    () => initial?.moneyCategoryId ?? "",
  );
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
    const principalMinor = parseMajorToMinor(principal, currency);
    const collateralMinor = parseMajorToMinor(collateral, currency);
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
    currency,
  ]);

  const scheduleInput = useMemo(() => {
    if (!parsedInputs) return null;
    const customMinor = useCustomPayment
      ? parseMajorToMinor(customPayment, currency)
      : null;
    const customAfterRateChangeMinor = useCustomPaymentAfterRateChange
      ? parseMajorToMinor(customPaymentAfterRateChange, currency)
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
    currency,
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

  function resetCreateForm() {
    setName("");
    setPrincipal("");
    setCollateral("");
    setRatePercent("5.25");
    setTermMonths("300");
    setInitialRateMonths("");
    setRateAfterInitialPercent("");
    setStartDate(localDateString());
    setDueDay("25");
    setUseCustomPayment(false);
    setCustomPayment("");
    setUseCustomPaymentAfterRateChange(false);
    setCustomPaymentAfterRateChange("");
    setShowSchedulePreview(false);
    setMoneyAccountId("");
    setMoneyCategoryId("");
    setAutoMarkPastDuePaid(false);
    setAutoMarkPastDueWithoutTransaction(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const principalMinor = parseMajorToMinor(principal, currency);
      if (principalMinor == null || principalMinor <= 0) {
        throw new Error("Enter a valid principal amount");
      }
      const annualRateBps = Math.round(parseFloat(ratePercent) * 100);
      let paymentMinor: number | undefined;
      if (useCustomPayment) {
        paymentMinor = parseMajorToMinor(customPayment, currency) ?? undefined;
        if (paymentMinor == null || paymentMinor <= 0) {
          throw new Error("Enter a valid custom monthly payment");
        }
      }
      let paymentAfterRateChangeMinor: number | undefined;
      if (useCustomPaymentAfterRateChange) {
        paymentAfterRateChangeMinor =
          parseMajorToMinor(customPaymentAfterRateChange, currency) ??
          undefined;
        if (
          paymentAfterRateChangeMinor == null ||
          paymentAfterRateChangeMinor <= 0
        ) {
          throw new Error("Enter a valid payment after rate change");
        }
      }
      const collateralMinor = parseMajorToMinor(collateral, currency);
      const term = Number(termMonths);
      const initialRateMonthsNum =
        initialRateMonths.trim() === "" ? null : Number(initialRateMonths);
      const rateAfterInitialBps =
        rateAfterInitialPercent.trim() === ""
          ? null
          : Math.round(parseFloat(rateAfterInitialPercent) * 100);

      const input = {
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
          : {
              initialRateMonths: null,
              rateAfterInitialBps: null,
            }),
        ...(paymentAfterRateChangeMinor != null
          ? { paymentAfterRateChangeMinor }
          : { paymentAfterRateChangeMinor: null }),
        ...(collateralMinor != null && collateralMinor > 0
          ? { collateralValueMinor: collateralMinor }
          : { collateralValueMinor: null }),
        moneyWorkspaceId: moneyBootstrap.data?.workspaceId ?? null,
        moneyAccountId: moneyAccountId || null,
        moneyCategoryId: moneyCategoryId || null,
      };

      if (isEdit && initial) {
        await loansGraphQLRequest<{ loanUpdate: { id: string } }>(
          LOAN_UPDATE_MUTATION,
          { input: { id: initial.id, ...input } },
        );
        await queryClient.invalidateQueries({ queryKey: loansKeys.all });
        notify.success("Loan updated");
        router.push(`/loans/${initial.id}`);
      } else {
        const result = await loansGraphQLRequest<{
          loanCreate: { id: string };
        }>(LOAN_CREATE_MUTATION, {
          input: {
            ...input,
            ...(pastDueCount > 0 && autoMarkPastDuePaid
              ? {
                  autoMarkPastDuePaid: true,
                  autoMarkPastDueWithoutTransaction,
                }
              : {}),
          },
        });
        const loanId = result.loanCreate.id;
        notify.success("Loan created", undefined, {
          href: `/loans/${loanId}`,
          label: "View loan",
        });
        resetCreateForm();
      }
    } catch (err) {
      notify.error(
        isEdit ? "Could not update loan" : "Could not create loan",
        toUserFacingMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
      <form onSubmit={onSubmit} className="space-y-5">
          {isEdit ? (
            <p className="rounded-[var(--radius-sm)] bg-muted-surface/40 px-3 py-2 text-sm text-muted">
              Unpaid installments will be recalculated from the remaining
              balance. Paid payments and linked Money transactions stay as
              recorded.
            </p>
          ) : null}

          <Field label="Loan name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Field label={`Principal (${currency})`}>
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
            <p className="text-sm text-muted">
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
                  <p className="text-sm text-muted">Monthly payment</p>
                  <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                    {formatMinor(computedPaymentMinor, currency)}
                  </p>
                </div>
                {firstMonthInterestMinor != null ? (
                  <div>
                    <p className="text-sm text-muted">First-month interest</p>
                    <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                      {formatMinor(firstMonthInterestMinor, currency)}
                    </p>
                  </div>
                ) : null}
                {firstMonthPrincipalMinor != null ? (
                  <div>
                    <p className="text-sm text-muted">First-month principal</p>
                    <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                      {formatMinor(firstMonthPrincipalMinor, currency)}
                    </p>
                  </div>
                ) : null}
              </div>
              {schedulePreview != null && schedulePreview.length > 0 ? (
                <div className="mt-4">
                  <button
                    type="button"
                    className="text-sm font-medium text-accent transition-colors duration-150 hover:text-foreground"
                    onClick={() => setShowSchedulePreview((v) => !v)}
                  >
                    {showSchedulePreview ? "Hide" : "Show"} schedule preview
                  </button>
                  {showSchedulePreview ? (
                    <div className="mt-2">
                      <Table>
                        <TableCaption>
                          Amortization schedule preview
                        </TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Due date</TableHead>
                            <TableHead align="end">Payment</TableHead>
                            <TableHead align="end">Interest</TableHead>
                            <TableHead align="end">Principal</TableHead>
                            <TableHead align="end">Balance after</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedulePreview.slice(0, 6).map((row) => (
                            <TableRow key={row.installmentNumber}>
                              <TableCell
                                numeric
                                className="whitespace-nowrap"
                              >
                                {row.installmentNumber}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-muted">
                                {formatDate(row.dueDate, {
                                  omitYearIfCurrent: true,
                                })}
                              </TableCell>
                              <TableCell
                                align="end"
                                numeric
                                className="whitespace-nowrap"
                              >
                                {formatMinor(row.paymentMinor, currency)}
                              </TableCell>
                              <TableCell
                                align="end"
                                numeric
                                className="whitespace-nowrap text-muted"
                              >
                                {formatMinor(
                                  row.interestMinor,
                                  currency,
                                )}
                              </TableCell>
                              <TableCell
                                align="end"
                                numeric
                                className="whitespace-nowrap"
                              >
                                {formatMinor(
                                  row.principalMinor,
                                  currency,
                                )}
                              </TableCell>
                              <TableCell
                                align="end"
                                numeric
                                className="whitespace-nowrap text-muted"
                              >
                                {formatMinor(
                                  row.balanceAfterMinor,
                                  currency,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {schedulePreview.length > 6 ? (
                        <p className="mt-2 text-sm text-muted">
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

          <Field label={`Collateral value (${currency})`}>
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
                <p className="flex items-center gap-1 text-sm text-muted">
                  LTV ratio
                  <AboutDisclosure compact label="About LTV">
                    Loan amount divided by collateral value — lower is safer for
                    the lender.
                  </AboutDisclosure>
                </p>
                <p className="mt-0.5 text-sm font-medium tabular-nums">{ltvLabel}</p>
              </div>
              {downPaymentMinor != null ? (
                <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 px-3 py-2">
                  <p className="text-sm text-muted">Down payment</p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums">
                    {formatMinor(downPaymentMinor, currency)}
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

          {!isEdit && pastDueCount > 0 ? (
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
                  <p className="mt-0.5 text-sm text-muted">
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
                        <p className="mt-0.5 text-sm text-muted">
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
                <p className="mt-0.5 text-sm text-muted">
                  {computedPaymentMinor != null
                    ? `Calculated payment: ${formatMinor(computedPaymentMinor, currency)}`
                    : "Enter principal, rate, and term to see the calculated payment."}
                </p>
                {useCustomPayment ? (
                  <Field label={`Monthly payment (${currency})`} className="mt-3">
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
                  <p className="mt-0.5 text-sm text-muted">
                    From month {parsedInputs!.initialRateMonths! + 1}, payment
                    recalculates as an estimated monthly payment on the remaining
                    balance unless you override it here.
                  </p>
                  {useCustomPaymentAfterRateChange ? (
                    <Field
                      label={`Payment after rate change (${currency})`}
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
                : "set up in Money settings → Accounts"}
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
            disabled={saving || (!isEdit && needsMoneyAccountForAutoMark)}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create loan"}
          </Button>
          {!isEdit && needsMoneyAccountForAutoMark ? (
            <Alert
              variant="warning"
              title="Account required"
              description={
                !moneyBootstrap.data?.workspaceId
                  ? "Set up a Money workspace in Money settings → Accounts before creating transactions for past-due installments."
                  : "Select a pay-from account to create Money transactions for past-due installments."
              }
            />
          ) : null}
        </form>
    </div>
  );
}

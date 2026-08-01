"use client";

import { queryErrorMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { LoanDetailOptionsMenu } from "@/components/loan-detail-options-menu";
import { LoanPayActions } from "@/components/loan-pay-actions";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import {
  loanProgressSeriesColors,
  type LoanProgressSeriesKey,
} from "@/components/charts/loan-progress-colors";
import { useTheme } from "@/components/theme-provider";
import { LoanDetailStats } from "@/components/loan-detail-stats";
import { LoanInstallmentsTable } from "@/components/loan-installments-table";
import { LoanDetailPageSkeleton } from "@/components/loan-detail-skeleton";
import {
  LoansWorkspaceProvider,
  useLoansWorkspace,
} from "@/components/loans-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { loanDetailQueryOptions, type LoanDetail } from "@/lib/loans-query-options";
import { cn } from "@/lib/cn";

const AnalyticsChartContainer = dynamic(
  () =>
    import("@/components/analytics-chart-cards").then((m) => ({
      default: m.AnalyticsChartContainer,
    })),
  { ssr: false },
);

const LoanProgressChart = dynamic(
  () =>
    import("@/components/charts/loan-progress-chart").then((m) => ({
      default: m.LoanProgressChart,
    })),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-0 w-full rounded-[var(--radius-sm)]" />
    ),
  },
);

const LOAN_DETAIL_GRID_CLASS =
  "grid w-full grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12 lg:gap-3";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LoanDetailBreadcrumb({ loanName }: { loanName: string }) {
  const itemCls =
    "rounded-[var(--radius-sm)] px-1 py-0.5 text-sm font-medium text-muted transition-colors duration-150 hover:text-foreground";

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/money/loans" className={itemCls}>
            Loans
          </Link>
        </li>
        <li aria-hidden className="text-sm text-muted">
          /
        </li>
        <li
          className="text-sm font-medium text-foreground"
          aria-current="page"
        >
          {loanName}
        </li>
      </ol>
    </nav>
  );
}

export function LoanDetailPage({ loanId }: { loanId: string }) {
  return (
    <LoansWorkspaceProvider>
      <LoanDetailInner loanId={loanId} />
    </LoansWorkspaceProvider>
  );
}

function LoanPayoffProgressCard({ loan }: { loan: LoanDetail }) {
  const { resolved, style } = useTheme();
  const [hiddenSeries, setHiddenSeries] = useState(
    () => new Set<LoanProgressSeriesKey>(),
  );
  const colors = loanProgressSeriesColors(resolved, style);
  const lastPoint = loan.chart[loan.chart.length - 1];

  const legendItems = useMemo(
    () =>
      (
        [
          { key: "actual" as const, label: "Paid" },
          { key: "scheduled" as const, label: "Scheduled" },
          { key: "projected" as const, label: "Projected" },
        ] as const
      ).map(({ key, label }) => ({
        key,
        label,
        color: colors[key],
        valueText: formatMinor(
          lastPoint
            ? key === "actual"
              ? lastPoint.actualCumulativeMinor
              : key === "scheduled"
                ? lastPoint.scheduledCumulativeMinor
                : lastPoint.projectedCumulativeMinor
            : 0,
          loan.currency,
        ),
      })),
    [colors, lastPoint, loan.currency],
  );

  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Payoff progress</h2>
      <p className="mb-2 text-xs text-muted">
        Solid: principal paid to date. Dashed: scheduled. Dotted: projected.
      </p>
      <AnalyticsChartContainer
        legendLayout="compact"
        legend={
          loan.chart.length > 0 ? (
            <ChartLegendList
              items={legendItems}
              hiddenKeys={hiddenSeries}
              onToggle={(key) =>
                setHiddenSeries((s) => toggleSetKey(s, key as LoanProgressSeriesKey))
              }
              showValues={false}
            />
          ) : undefined
        }
      >
        <LoanProgressChart
          data={loan.chart}
          formatY={(minor) => formatMinor(minor, loan.currency)}
          hiddenSeries={hiddenSeries}
        />
      </AnalyticsChartContainer>
    </Card>
  );
}

function LoanDetailInner({ loanId }: { loanId: string }) {
  const { workspaceReady } = useLoansWorkspace();
  const { formatDate } = useFormatDate();
  const detailQuery = useQuery({
    ...loanDetailQueryOptions(loanId),
    enabled: workspaceReady,
  });
  const loan = detailQuery.data;

  if (detailQuery.isLoading || !workspaceReady) {
    return <LoanDetailPageSkeleton />;
  }

  if (detailQuery.isError || !loan) {
    return (
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <Alert
          variant="error"
          title="Couldn’t load loan"
          description={
            queryErrorMessage(detailQuery.error) ?? "Loan not found"
          }
        />
        <Link
          href="/money/loans"
          className={buttonClassName({
            variant: "secondary",
            size: "md",
            className: "mt-4",
          })}
        >
          Back to loans
        </Link>
      </div>
    );
  }

  const nextPending = loan.installments.find((i) => i.status === "pending");
  const nextOverdue =
    nextPending != null && nextPending.dueDate < todayIso();

  return (
    <>
      <header className="col-span-2 md:col-span-6 lg:col-span-12 fx-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <LoanDetailBreadcrumb loanName={loan.name} />
            <div className="mt-4 flex min-w-0 items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {loan.name}
              </h1>
              <AboutDisclosure label={`About ${loan.name}`}>
                <p>
                  Track payoff progress, record payments, and review your
                  amortization schedule. Payments can be posted to Money or marked
                  paid without a ledger entry.
                </p>
              </AboutDisclosure>
            </div>
          </div>
          <LoanDetailOptionsMenu
            loanId={loan.id}
            loanName={loan.name}
            status={loan.status}
          />
        </div>
      </header>

      <div className={LOAN_DETAIL_GRID_CLASS}>
        <LoanDetailStats loan={loan} />

        {nextPending ? (
          <Card
            className={cn(
              "col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12",
              nextOverdue && "border-[var(--alert-warning-border)]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-medium">
                  {nextOverdue ? "Overdue payment" : "Next payment"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Installment #{nextPending.installmentNumber} · due{" "}
                  {formatDate(nextPending.dueDate, { omitYearIfCurrent: true })}
                </p>
              </div>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatMinor(nextPending.paymentMinor, loan.currency)}
              </p>
            </div>
            {nextOverdue ? (
              <Alert
                variant="warning"
                title="This installment is past due"
                description="Record the payment to keep your schedule on track."
                className="mt-4"
              />
            ) : null}
            <div className="mt-4">
              <LoanPayActions
                scheduleInstallmentId={nextPending.scheduleInstallmentId}
                loanName={loan.name}
                installmentNumber={nextPending.installmentNumber}
                paymentMinor={nextPending.paymentMinor}
                currency={loan.currency}
                moneyAccountId={loan.moneyAccountId}
                moneyCategoryId={loan.moneyCategoryId}
              />
            </div>
          </Card>
        ) : loan.status === "paid_off" ? (
          <Card className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12">
            <h2 className="font-display text-lg font-medium text-accent">
              Loan paid off
            </h2>
            <p className="mt-1 text-sm text-muted">
              All installments are complete. No further payments are due.
            </p>
          </Card>
        ) : null}

        <LoanPayoffProgressCard loan={loan} />

        <LoanInstallmentsTable
          loan={loan}
          nextPendingId={nextPending?.scheduleInstallmentId ?? null}
        />
      </div>
    </>
  );
}

"use client";

import { queryErrorMessage } from "@/lib/user-facing-error";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSetAppHeader } from "@/components/app-header-override";
import { LoanCreateForm } from "@/components/loan-create-form";
import {
  LoansWorkspaceProvider,
  useLoansWorkspace,
} from "@/components/loans-workspace-provider";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { loanDetailQueryOptions } from "@/lib/loans-query-options";
import { cn } from "@/lib/cn";

function LoanEditFormSkeleton() {
  return (
    <div className={cn(SHELL_FULL_SPAN, "space-y-5")}>
      <Skeleton className="h-10 w-full max-w-xl rounded-[var(--radius-sm)]" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
      <div className="rounded-[var(--radius-sm)] bg-muted-surface/40 p-4">
        <Skeleton className="h-4 w-48 rounded-[var(--radius-sm)]" />
        <div className="mt-3 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-12 w-full rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <Skeleton className="h-12 w-36 rounded-[var(--radius-md)]" />
    </div>
  );
}

function LoanEditHeaderSync({
  loanId,
  loanName,
}: {
  loanId: string;
  loanName: string;
}) {
  useSetAppHeader({
    title: "Edit loan",
    meta: "Update terms. Unpaid installments are recalculated; paid payments stay as recorded.",
    breadcrumbs: [
      { label: "Loans", href: "/loans" },
      { label: loanName, href: `/loans/${loanId}` },
      { label: "Edit loan" },
    ],
    cta: null,
  });
  return null;
}

function LoanEditInner({ loanId }: { loanId: string }) {
  const { workspaceReady } = useLoansWorkspace();
  const detailQuery = useQuery({
    ...loanDetailQueryOptions(loanId),
    enabled: workspaceReady,
  });
  const loan = detailQuery.data;

  if (detailQuery.isLoading || !workspaceReady) {
    return <LoanEditFormSkeleton />;
  }

  if (detailQuery.isError || !loan) {
    return (
      <div className={SHELL_FULL_SPAN}>
        <Alert
          variant="error"
          title="Couldn’t load loan"
          description={
            queryErrorMessage(detailQuery.error) ?? "Loan not found"
          }
        />
        <Link
          href="/loans"
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

  if (loan.status === "cancelled") {
    return (
      <div className={SHELL_FULL_SPAN}>
        <Alert
          variant="warning"
          title="This loan was deleted"
          description="Cancelled loans cannot be edited."
        />
        <Link
          href="/loans"
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

  return (
    <>
      <LoanEditHeaderSync loanId={loan.id} loanName={loan.name} />
      <LoanCreateForm mode="edit" initial={loan} />
    </>
  );
}

export function LoanEditPage({ loanId }: { loanId: string }) {
  return (
    <LoansWorkspaceProvider>
      <LoanEditInner loanId={loanId} />
    </LoansWorkspaceProvider>
  );
}

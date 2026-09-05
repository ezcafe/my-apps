import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

export type LoanAppHeaderResolved = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  cta: { href: string; label: string } | null;
  meta?: string;
  needsOverride?: boolean;
};

const CREATE_CTA = { href: "/loans/new", label: "Create loan" };

function loanDetailId(pathname: string): string | null {
  const loanSeg = /^\/loans\/([^/]+)/.exec(pathname)?.[1];
  if (
    loanSeg != null &&
    loanSeg !== "new" &&
    loanSeg !== "settings" &&
    loanSeg !== "insights"
  ) {
    return loanSeg;
  }
  return null;
}

function isLoanEditPath(pathname: string): boolean {
  return /^\/loans\/[^/]+\/edit\/?$/.test(pathname);
}

/**
 * Pathname → page heading defaults for `/loans`.
 */
export function resolveLoanAppHeader(pathname: string): LoanAppHeaderResolved {
  if (pathname === "/loans/new" || pathname.startsWith("/loans/new/")) {
    return {
      title: "Create loan",
      breadcrumbs: [
        { label: "Loans", href: "/loans" },
        { label: "Create loan" },
      ],
      cta: null,
      meta: "Set up a loan with balance, rate, and payment schedule.",
    };
  }

  if (pathname === "/loans/settings" || pathname.startsWith("/loans/settings/")) {
    return {
      title: "Loans settings",
      breadcrumbs: [
        { label: "Loans", href: "/loans" },
        { label: "Settings" },
      ],
      cta: null,
      meta: "Payment reminders and notification preferences.",
    };
  }

  if (pathname === "/loans/insights" || pathname.startsWith("/loans/insights/")) {
    return {
      title: "Insights",
      breadcrumbs: [],
      cta: null,
      meta: "Payoff progress, balance trends, and loan metrics for the selected range.",
    };
  }

  if (isLoanEditPath(pathname)) {
    const loanId = loanDetailId(pathname);
    return {
      title: "Edit loan",
      breadcrumbs: [
        { label: "Loans", href: "/loans" },
        ...(loanId
          ? [{ label: "Loan", href: `/loans/${loanId}` } as BreadcrumbItem]
          : []),
        { label: "Edit loan" },
      ],
      cta: null,
      meta: "Update terms. Unpaid installments are recalculated; paid payments stay as recorded.",
      needsOverride: true,
    };
  }

  const loanId = loanDetailId(pathname);
  if (loanId) {
    return {
      title: "Loan",
      breadcrumbs: [
        { label: "Loans", href: "/loans" },
        { label: "Loan" },
      ],
      cta: null,
      needsOverride: true,
    };
  }

  return {
    title: "Loans",
    breadcrumbs: [],
    cta: CREATE_CTA,
    meta: "Active loans, upcoming payments, and payoff progress.",
  };
}

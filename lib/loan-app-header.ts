import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

export type LoanAppHeaderResolved = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  cta: { href: string; label: string } | null;
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
    };
  }

  if (pathname === "/loans/insights" || pathname.startsWith("/loans/insights/")) {
    return {
      title: "Insights",
      breadcrumbs: [],
      cta: CREATE_CTA,
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
  };
}

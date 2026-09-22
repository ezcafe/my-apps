import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import type { AppHeaderOverride } from "@/components/app-header-override";

/** Pathname-resolved header shared by Investments / Loans (and similar). */
export type MoneyFamilyResolvedHeader = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  cta: { href: string; label: string } | null;
  meta?: string;
};

export type MoneyFamilyHeadingViewModel = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  description: ReactNode | undefined;
  meta: ReactNode | undefined;
  /** When set, render as PageHeading actions (Loans More menu, etc.). */
  customActions: ReactNode | null;
  /** When customActions is null, render default primary CTA from this (or nothing). */
  ctaLink: { href: string; label: string } | null;
};

/**
 * Merge pathname resolver + optional override + optional header actions.
 * Mirrors Investment/Loan section heading behavior before extract.
 */
export function mergeMoneyFamilyHeadingViewModel(input: {
  resolved: MoneyFamilyResolvedHeader;
  override: AppHeaderOverride | null;
  headerActions: ReactNode | null;
}): MoneyFamilyHeadingViewModel {
  const { resolved, override, headerActions } = input;

  const title = override?.title ?? resolved.title;
  const breadcrumbs = override?.breadcrumbs ?? resolved.breadcrumbs;
  const description = override?.description;
  const meta = override?.meta ?? resolved.meta;
  const cta =
    override != null && "cta" in override
      ? (override.cta ?? null)
      : resolved.cta;

  if (headerActions != null) {
    return {
      title,
      breadcrumbs,
      description,
      meta,
      customActions: headerActions,
      ctaLink: null,
    };
  }

  return {
    title,
    breadcrumbs,
    description,
    meta,
    customActions: null,
    ctaLink: cta,
  };
}

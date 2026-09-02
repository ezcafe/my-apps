import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

export type CoreAppHeaderResolved = {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  meta?: string;
  cta: { href: string; label: string } | null;
};

/**
 * Pathname → page heading defaults for core shell routes (`/settings`, `/help`).
 */
export function resolveCoreAppHeader(pathname: string): CoreAppHeaderResolved {
  if (pathname === "/") {
    return {
      title: "Home",
      breadcrumbs: [],
      meta: "Today at a glance — net money, loans, and weather.",
      cta: null,
    };
  }

  if (pathname === "/help" || pathname.startsWith("/help/")) {
    return {
      title: "API help",
      breadcrumbs: [],
      meta: "Quick start for REST and GraphQL with bearer tokens.",
      cta: { href: "/settings#settings-api-tokens", label: "Create token" },
    };
  }

  return {
    title: "Settings",
    breadcrumbs: [],
    meta: "API tokens, workspaces, profile, theme, and date format.",
    cta: null,
  };
}

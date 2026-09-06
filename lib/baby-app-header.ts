import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import type { BabyMessageKey } from "@/messages/baby/en";

export type BabyAppHeaderCrumb = {
  labelKey: BabyMessageKey;
  href?: string;
};

export type BabyAppHeaderResolved = {
  titleKey: BabyMessageKey;
  breadcrumbs: BabyAppHeaderCrumb[];
};

/**
 * Pathname → page heading defaults for `/baby` (title keys for i18n).
 */
export function resolveBabyAppHeader(pathname: string): BabyAppHeaderResolved {
  if (pathname === "/baby/feed" || pathname.startsWith("/baby/feed/")) {
    return {
      titleKey: "feed.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "feed.title" },
      ],
    };
  }

  if (pathname === "/baby/sleep" || pathname.startsWith("/baby/sleep/")) {
    return {
      titleKey: "sleep.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "sleep.title" },
      ],
    };
  }

  if (pathname === "/baby/diaper" || pathname.startsWith("/baby/diaper/")) {
    return {
      titleKey: "diaper.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "diaper.title" },
      ],
    };
  }

  if (pathname === "/baby/insights" || pathname.startsWith("/baby/insights/")) {
    return {
      titleKey: "insights.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "insights.title" },
      ],
    };
  }

  if (pathname === "/baby/measure" || pathname.startsWith("/baby/measure/")) {
    return {
      titleKey: "measure.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "measure.title" },
      ],
    };
  }

  if (pathname === "/baby/vaccines" || pathname.startsWith("/baby/vaccines/")) {
    return {
      titleKey: "vaccine.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "vaccine.title" },
      ],
    };
  }

  if (pathname === "/baby/settings" || pathname.startsWith("/baby/settings/")) {
    return {
      titleKey: "settings.title",
      breadcrumbs: [
        { labelKey: "home.title", href: "/baby" },
        { labelKey: "settings.title" },
      ],
    };
  }

  return {
    titleKey: "home.title",
    breadcrumbs: [],
  };
}

/** Map resolved crumbs to PageHeading breadcrumb items. */
export function babyHeaderBreadcrumbs(
  crumbs: BabyAppHeaderCrumb[],
  t: (key: BabyMessageKey) => string,
): BreadcrumbItem[] {
  return crumbs.map((crumb) =>
    crumb.href != null
      ? { label: t(crumb.labelKey), href: crumb.href }
      : { label: t(crumb.labelKey) },
  );
}

import type { WorkspaceAppKey } from "@/db/schema/workspace";

/** Icons resolved in the shell (`app-shell.tsx`) to avoid bundling React components into shared server modules. */
export type ShellNavIconId =
  | "home"
  | "money"
  | "savings"
  | "investment"
  | "loans"
  | "help"
  | "settings";

/** Routes that are not tied to a `WorkspaceAppKey` (marketing, account, theme). */
export type CoreShellNavItem = {
  kind: "core";
  id: string;
  label: string;
  href: string;
  order: number;
  icon: ShellNavIconId;
  /** `exact` = only `pathname === href`; `prefix` = href or subpaths. */
  activeMatch: "exact" | "prefix";
};

/** First-class product area: must use shared workspace cookies/APIs for this `WorkspaceAppKey`. */
export type FeatureShellNavItem = {
  kind: "feature";
  id: string;
  label: string;
  href: string;
  /** Used for active state, e.g. `/money` for the Money module. */
  matchPrefix: string;
  order: number;
  workspaceAppKey: WorkspaceAppKey;
  icon: ShellNavIconId;
};

export type ShellNavItem = CoreShellNavItem | FeatureShellNavItem;

/**
 * Ordered shell navigation. Add new product features here with a real
 * `workspaceAppKey` (see `WORKSPACE_APP_KEYS` in `db/schema/workspace.ts`).
 */
const shellNavItemsSource: ShellNavItem[] = [
  {
    kind: "feature",
    id: "money",
    label: "Money",
    href: "/money/analytics",
    matchPrefix: "/money",
    order: 0,
    workspaceAppKey: "money",
    icon: "money",
  },
  {
    kind: "core",
    id: "help",
    label: "Help",
    href: "/help",
    order: 15,
    icon: "help",
    activeMatch: "prefix",
  },
  {
    kind: "core",
    id: "settings",
    label: "Settings",
    href: "/settings",
    order: 20,
    icon: "settings",
    activeMatch: "prefix",
  },
];

export const shellNavItems: ShellNavItem[] = shellNavItemsSource.sort(
  (a, b) => a.order - b.order,
);

export function isShellNavActive(item: ShellNavItem, pathname: string): boolean {
  if (item.kind === "feature") {
    return (
      pathname === item.href ||
      pathname === item.matchPrefix ||
      pathname.startsWith(`${item.matchPrefix}/`)
    );
  }
  if (item.activeMatch === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Feature rows from the shell registry (for docs / tooling). */
export function registeredWorkspaceFeatures(): FeatureShellNavItem[] {
  return shellNavItems.filter((i): i is FeatureShellNavItem => i.kind === "feature");
}

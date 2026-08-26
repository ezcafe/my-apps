/** True when Money in-page chrome should replace shell nav. */
export function isMoneyTabsChromePath(pathname: string): boolean {
  return pathname === "/money" || pathname.startsWith("/money/");
}

/** True when Investments in-page chrome should replace shell nav. */
export function isInvestmentsChromePath(pathname: string): boolean {
  return pathname === "/investments" || pathname.startsWith("/investments/");
}

/** True when Loans in-page chrome should replace shell nav. */
export function isLoansChromePath(pathname: string): boolean {
  return pathname === "/loans" || pathname.startsWith("/loans/");
}

export type AppNavMenuPanel = "root" | "money" | "investments" | "loans";

/** Nested hamburger: open on the app that matches the current route. */
export function appNavMenuPanelForPath(pathname: string): AppNavMenuPanel {
  if (isInvestmentsChromePath(pathname)) return "investments";
  if (isLoansChromePath(pathname)) return "loans";
  if (isMoneyTabsChromePath(pathname)) return "money";
  return "root";
}

/**
 * True when the shell aside / fixed mobile menu should hide in favor of an
 * in-page button menu (Money, Investments, Loans, Help, App settings).
 */
export function hidesShellRailChrome(pathname: string): boolean {
  if (isMoneyTabsChromePath(pathname)) return true;
  if (isInvestmentsChromePath(pathname)) return true;
  if (isLoansChromePath(pathname)) return true;
  if (pathname === "/help" || pathname.startsWith("/help/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  return false;
}

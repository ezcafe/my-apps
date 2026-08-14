/**
 * True when Money chrome (`MoneySectionTabs`) should replace shell nav —
 * any route under `/money`.
 */
export function isMoneyTabsChromePath(pathname: string): boolean {
  return pathname === "/money" || pathname.startsWith("/money/");
}

/**
 * True when the shell aside / fixed mobile menu should hide in favor of an
 * in-page button menu (Money chrome, Help, App settings).
 */
export function hidesShellRailChrome(pathname: string): boolean {
  if (isMoneyTabsChromePath(pathname)) return true;
  if (pathname === "/help" || pathname.startsWith("/help/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  return false;
}

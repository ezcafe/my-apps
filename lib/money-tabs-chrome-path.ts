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

/** True when Baby Care in-page chrome should replace shell nav. */
export function isBabyChromePath(pathname: string): boolean {
  return pathname === "/baby" || pathname.startsWith("/baby/");
}

/**
 * True when the shell aside / fixed mobile menu should hide in favor of an
 * in-page button menu (Money, Investments, Loans, Baby, Help, Settings).
 */
export function hidesShellRailChrome(pathname: string): boolean {
  if (pathname === "/kiosk") return true;
  if (isMoneyTabsChromePath(pathname)) return true;
  if (isInvestmentsChromePath(pathname)) return true;
  if (isLoansChromePath(pathname)) return true;
  if (isBabyChromePath(pathname)) return true;
  if (pathname === "/help" || pathname.startsWith("/help/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  return false;
}

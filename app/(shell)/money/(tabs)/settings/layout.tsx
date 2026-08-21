import type { ReactNode } from "react";

/** Span is applied once by each settings page root — do not wrap here. */
export default function MoneySettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

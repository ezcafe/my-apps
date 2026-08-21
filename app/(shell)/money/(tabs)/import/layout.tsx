import type { ReactNode } from "react";

/** Span is applied once by the import wizard root — do not wrap here. */
export default function MoneyImportLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

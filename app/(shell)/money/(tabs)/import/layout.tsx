import type { ReactNode } from "react";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export default function MoneyImportLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={MONEY_FULL_SPAN}>{children}</div>;
}

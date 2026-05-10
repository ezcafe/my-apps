"use client";

import dynamic from "next/dynamic";
import type { MoneyImportKind } from "@/lib/money-import-kinds";

const MoneyCsvImportWizard = dynamic(
  () =>
    import("@/components/money-settings/money-csv-import-wizard").then(
      (m) => ({ default: m.MoneyCsvImportWizard }),
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted">Loading import wizard…</p>
    ),
  },
);

export function MoneyCsvImportWizardLazy(props: {
  initialKind?: MoneyImportKind;
}) {
  return <MoneyCsvImportWizard {...props} />;
}

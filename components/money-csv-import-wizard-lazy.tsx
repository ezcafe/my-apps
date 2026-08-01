"use client";

import dynamic from "next/dynamic";
import type { MoneyImportKind } from "@/lib/money-import-kinds";
import { MoneyCsvImportWizardSkeleton } from "@/components/money-csv-import-wizard-skeleton";

const MoneyCsvImportWizard = dynamic(
  () =>
    import("@/components/money-settings/money-csv-import-wizard").then(
      (m) => ({ default: m.MoneyCsvImportWizard }),
    ),
  {
    ssr: false,
    loading: () => <MoneyCsvImportWizardSkeleton />,
  },
);

export function MoneyCsvImportWizardLazy(props: {
  initialKind?: MoneyImportKind;
}) {
  return <MoneyCsvImportWizard {...props} />;
}

"use client";

import dynamic from "next/dynamic";
import type { MoneyImportKind } from "@/lib/money-import-kinds";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MoneyCsvImportWizard = dynamic(
  () =>
    import("@/components/money-settings/money-csv-import-wizard").then(
      (m) => ({ default: m.MoneyCsvImportWizard }),
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="space-y-3 p-5">
        <Skeleton className="h-6 w-44 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-3 w-12 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-32 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
      </Card>
    ),
  },
);

export function MoneyCsvImportWizardLazy(props: {
  initialKind?: MoneyImportKind;
}) {
  return <MoneyCsvImportWizard {...props} />;
}

import { MoneyCsvImportWizardLazy } from "@/components/money-csv-import-wizard-lazy";
import { isMoneyImportKind } from "@/lib/money-import-kinds";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ kind: string }> };

export default async function MoneyImportKindPage({ params }: PageProps) {
  const { kind: kindParam } = await params;
  if (!isMoneyImportKind(kindParam)) notFound();
  return <MoneyCsvImportWizardLazy initialKind={kindParam} />;
}

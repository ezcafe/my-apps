import { MoneyCsvImportWizard } from "@/components/money-settings/money-csv-import-wizard";
import { isMoneyImportKind } from "@/lib/money-import-kinds";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ kind: string }> };

export default async function MoneyImportKindPage({ params }: PageProps) {
  const { kind: kindParam } = await params;
  if (!isMoneyImportKind(kindParam)) notFound();
  return <MoneyCsvImportWizard initialKind={kindParam} />;
}

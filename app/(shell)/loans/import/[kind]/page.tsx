import { FeatureCsvImportWizard } from "@/components/feature-csv-import-wizard";
import {
  isLoansImportKind,
  loansImportFieldDefs,
  loansImportSectionTitle,
} from "@/lib/loans-import-kinds";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ kind: string }> };

export default async function LoansImportKindPage({ params }: PageProps) {
  const { kind: kindParam } = await params;
  if (!isLoansImportKind(kindParam)) notFound();
  const fieldKeys = loansImportFieldDefs(kindParam).map((d) => d.key);
  return (
    <FeatureCsvImportWizard
      appLabel="Loans"
      kind={kindParam}
      kindLabel={loansImportSectionTitle[kindParam]}
      settingsHref="/loans/settings"
      previewPath="/api/loans/import/preview"
      commitPath="/api/loans/import/commit"
      exportHref={`/api/loans/export/${kindParam}`}
      fieldKeys={fieldKeys}
    />
  );
}

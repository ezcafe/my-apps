import { FeatureCsvImportWizard } from "@/components/feature-csv-import-wizard";
import {
  babyImportFieldDefs,
  babyImportSectionTitle,
  isBabyImportKind,
} from "@/lib/baby-import-kinds";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ kind: string }> };

export default async function BabyImportKindPage({ params }: PageProps) {
  const { kind: kindParam } = await params;
  if (!isBabyImportKind(kindParam)) notFound();
  const fieldKeys = babyImportFieldDefs(kindParam).map((d) => d.key);
  return (
    <FeatureCsvImportWizard
      appLabel="Baby"
      kind={kindParam}
      kindLabel={babyImportSectionTitle[kindParam]}
      settingsHref="/baby/settings"
      previewPath="/api/baby/import/preview"
      commitPath="/api/baby/import/commit"
      exportHref={`/api/baby/export/${kindParam}`}
      fieldKeys={fieldKeys}
    />
  );
}

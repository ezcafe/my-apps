import { FeatureImportAllWizard } from "@/components/feature-import-all-wizard";

export default function MoneyImportAllPage() {
  return (
    <FeatureImportAllWizard
      title="Import all Money data"
      description="Upload a ZIP of Money CSV files (from Export all). Preview, then confirm. Kinds run in dependency order."
      previewPath="/api/money/import/all/preview"
      commitPath="/api/money/import/all/commit"
      exportAllHref="/api/money/export/all"
    />
  );
}

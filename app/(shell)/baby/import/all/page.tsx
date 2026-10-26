import { FeatureImportAllWizard } from "@/components/feature-import-all-wizard";

export default function BabyImportAllPage() {
  return (
    <FeatureImportAllWizard
      title="Import all Baby data"
      description="Upload a ZIP of Baby CSV files (from Export all). Preview, then confirm."
      previewPath="/api/baby/import/all/preview"
      commitPath="/api/baby/import/all/commit"
      exportAllHref="/api/baby/export/all"
    />
  );
}

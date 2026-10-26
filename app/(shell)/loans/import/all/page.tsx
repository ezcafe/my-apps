import { FeatureImportAllWizard } from "@/components/feature-import-all-wizard";

export default function LoansImportAllPage() {
  return (
    <FeatureImportAllWizard
      title="Import all Loans data"
      description="Upload a ZIP of Loans CSV files (from Export all). Preview, then confirm. Loans commit before installments."
      previewPath="/api/loans/import/all/preview"
      commitPath="/api/loans/import/all/commit"
      exportAllHref="/api/loans/export/all"
    />
  );
}
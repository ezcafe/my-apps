import dynamic from "next/dynamic";
import { InvestmentStatementImportSkeleton } from "@/components/investment-settings/investment-statement-import-skeleton";

const InvestmentStatementImportWizardLazy = dynamic(
  () =>
    import(
      "@/components/investment-settings/investment-statement-import-wizard"
    ).then((mod) => ({
      default: mod.InvestmentStatementImportWizard,
    })),
  { loading: () => <InvestmentStatementImportSkeleton /> },
);

export default function InvestmentStatementImportPage() {
  return <InvestmentStatementImportWizardLazy />;
}

import dynamic from "next/dynamic";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { InvestmentOpenCloseFormSkeleton } from "@/components/money-dashboard-skeleton";

const InvestmentOpenCloseFormLazy = dynamic(
  () =>
    import("@/components/investment-open-close-form").then((mod) => ({
      default: mod.InvestmentOpenCloseForm,
    })),
  { loading: () => <InvestmentOpenCloseFormSkeleton /> },
);

export default async function InvestmentsNewPage({
  searchParams,
}: {
  searchParams: Promise<{
    instrumentId?: string;
    mode?: string;
    openActivityId?: string;
  }>;
}) {
  const { instrumentId, mode, openActivityId } = await searchParams;
  return (
    <div className={SHELL_FULL_SPAN}>
      <InvestmentOpenCloseFormLazy
        initialInstrumentId={instrumentId}
        initialMode={mode}
        initialOpenActivityId={openActivityId}
      />
    </div>
  );
}

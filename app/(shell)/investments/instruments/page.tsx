import dynamic from "next/dynamic";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

function InstrumentsPageSkeleton() {
  return (
    <section className={`${MONEY_FULL_SPAN} w-full`}>
      <MoneyListSkeleton variant="loansTable" />
    </section>
  );
}

const InvestmentInstrumentsPageLazy = dynamic(
  () =>
    import("@/components/investment-instruments-page").then((mod) => ({
      default: mod.InvestmentInstrumentsPage,
    })),
  {
    loading: () => <InstrumentsPageSkeleton />,
  },
);

export default function InvestmentInstrumentsPage() {
  return <InvestmentInstrumentsPageLazy />;
}

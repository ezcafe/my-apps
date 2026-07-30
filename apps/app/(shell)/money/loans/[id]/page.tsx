import dynamic from "next/dynamic";
import { LoanDetailPageSkeleton } from "@/components/loan-detail-skeleton";
import { LoansWorkspaceProvider } from "@/components/loans-workspace-provider";

const LoanDetailPageLazy = dynamic(
  () =>
    import("@/components/loan-detail-page").then((mod) => ({
      default: mod.LoanDetailPage,
    })),
  {
    loading: () => <LoanDetailPageSkeleton />,
  },
);

export default async function MoneyLoanDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <LoansWorkspaceProvider>
      <LoanDetailPageLazy loanId={id} />
    </LoansWorkspaceProvider>
  );
}

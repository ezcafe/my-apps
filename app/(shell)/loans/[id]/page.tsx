import dynamic from "next/dynamic";
import { LoanDetailPageSkeleton } from "@/components/loan-detail-skeleton";

const LoanDetailPageLazy = dynamic(
  () =>
    import("@/components/loan-detail-page").then((mod) => ({
      default: mod.LoanDetailPage,
    })),
  {
    loading: () => <LoanDetailPageSkeleton />,
  },
);

export default async function LoanDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LoanDetailPageLazy loanId={id} />;
}

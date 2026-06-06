import { PageHeading } from "@/components/page-heading";
import { MoneyWorkspaceProvider } from "@/components/money-workspace-provider";
import { TransactionEditFormLazy } from "@/components/transaction-edit-form-lazy";

export default async function MoneyTransactionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;

  return (
    <>
      <PageHeading
        className="col-span-2 md:col-span-6 lg:col-span-12"
        title="Edit transaction"
        description="Update fields for this workspace transaction."
      />
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <MoneyWorkspaceProvider>
          <TransactionEditFormLazy transactionId={id} returnTo={returnTo} />
        </MoneyWorkspaceProvider>
      </div>
    </>
  );
}

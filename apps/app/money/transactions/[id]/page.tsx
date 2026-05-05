import { TransactionEditForm } from "@/components/transaction-edit-form";
import { PageHeading } from "@/components/page-heading";

export default async function MoneyTransactionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeading
        className="col-span-2 md:col-span-6 lg:col-span-12"
        title="Edit transaction"
        description="Update fields for this workspace transaction."
      />
      <div className="col-span-2 md:col-span-6 lg:col-span-12">
        <TransactionEditForm transactionId={id} />
      </div>
    </>
  );
}

import { PageHeading } from "@/components/page-heading";
import { MoneyAppMenu } from "@/components/money-section-tabs";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
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
        className={MONEY_FULL_SPAN}
        leading={<MoneyAppMenu />}
        title="Edit transaction"
        description="Update fields for this workspace transaction."
      />
      <div className={MONEY_FULL_SPAN}>
        <TransactionEditFormLazy transactionId={id} returnTo={returnTo} />
      </div>
    </>
  );
}

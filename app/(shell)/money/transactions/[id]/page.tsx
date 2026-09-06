import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { TransactionEditFormLazy } from "@/components/transaction-edit-form-lazy";
import { TransactionEditHeaderSync } from "@/components/transaction-edit-header-sync";

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
      <TransactionEditHeaderSync returnTo={returnTo} />
      <div className={SHELL_FULL_SPAN}>
        <TransactionEditFormLazy transactionId={id} returnTo={returnTo} />
      </div>
    </>
  );
}

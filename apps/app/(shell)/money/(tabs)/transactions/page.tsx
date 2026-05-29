import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { auth } from "@/auth";

export default async function MoneyTransactionsListPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyTransactionsPage userSub={userSub} authenticated={Boolean(userSub)} />
  );
}

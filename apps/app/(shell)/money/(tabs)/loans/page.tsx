import { MoneyLoansHome } from "@/components/money-loans-home";
import { auth } from "@/auth";

export default async function MoneyLoansPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyLoansHome
      userSub={userSub}
      authenticated={Boolean(userSub)}
    />
  );
}

import { MoneyInvestmentsHome } from "@/components/money-investments-home";
import { auth } from "@/auth";

export default async function MoneyInvestmentsPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyInvestmentsHome
      userSub={userSub}
      authenticated={Boolean(userSub)}
    />
  );
}

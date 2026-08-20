import { LoansDashboard } from "@/components/loans-dashboard";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

export function MoneyLoansHome() {
  return (
    <div className={MONEY_FULL_SPAN}>
      <LoansDashboard />
    </div>
  );
}

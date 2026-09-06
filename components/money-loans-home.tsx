import { LoansDashboard } from "@/components/loans-dashboard";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

export function MoneyLoansHome() {
  return (
    <div className={SHELL_FULL_SPAN}>
      <LoansDashboard />
    </div>
  );
}

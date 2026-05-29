"use client";

import { MoneyTransactionForm } from "@/components/money-transaction-form";

export function MoneyDashboard() {
  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <MoneyTransactionForm mode="transaction" />
    </div>
  );
}

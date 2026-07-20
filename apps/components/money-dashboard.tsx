"use client";

import { MoneyTransactionForm } from "@/components/money-transaction-form";

export function MoneyDashboard() {
  return (
    <div className="col-span-2 min-w-0 space-y-6 md:col-span-6 lg:col-span-12">
      <MoneyTransactionForm mode="transaction" />
    </div>
  );
}

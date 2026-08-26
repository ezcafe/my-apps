import { redirect } from "next/navigation";

/** Spending ledger lives at `/money`. */
export default function MoneySpendingAliasPage() {
  redirect("/money");
}

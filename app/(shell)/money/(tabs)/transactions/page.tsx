import { redirect } from "next/navigation";

export default function MoneyTransactionsListRedirect() {
  redirect("/money/spending");
}

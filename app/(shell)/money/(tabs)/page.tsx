import { redirect } from "next/navigation";

/** Money home is the spending ledger (`/money/spending`). */
export default function MoneyPage() {
  redirect("/money/spending");
}

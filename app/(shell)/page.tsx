import { redirect } from "next/navigation";

export default function ShellRootPage() {
  redirect("/money/new");
}

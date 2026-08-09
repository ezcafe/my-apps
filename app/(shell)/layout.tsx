import type { ReactNode } from "react";
import { auth } from "@/auth";
import { ShellLayout } from "@/components/shell-layout";

export default async function ShellRouteGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  return <ShellLayout session={session}>{children}</ShellLayout>;
}

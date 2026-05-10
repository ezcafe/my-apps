import type { ReactNode } from "react";
import { ShellLayout } from "@/components/shell-layout";

export default function ShellRouteGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ShellLayout>{children}</ShellLayout>;
}

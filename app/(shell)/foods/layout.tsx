import type { ReactNode } from "react";
import { FoodsWorkspaceProvider } from "@/components/foods-workspace-provider";

export default function FoodsLayout({ children }: { children: ReactNode }) {
  return <FoodsWorkspaceProvider>{children}</FoodsWorkspaceProvider>;
}

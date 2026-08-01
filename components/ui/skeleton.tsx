import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fx-shimmer rounded-[var(--radius-md)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

/** Mobile sticky primary CTA for ledger pages. Hidden on lg+ (header owns Add). */
export function MoneyQuickAddBar({
  href = "/money/new",
  label = "Add transaction",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <Link
        href={href}
        className={buttonClassName({
          variant: "primary",
          className:
            "pointer-events-auto min-w-[min(100%,20rem)] justify-center shadow-[var(--shadow-md)]",
        })}
      >
        {label}
      </Link>
    </div>
  );
}

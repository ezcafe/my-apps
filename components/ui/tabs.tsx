import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: ReactNode };

/** Accessible tablist using radio inputs + peer-checked underline. */
export function Tabs({
  name,
  items,
  value,
  onChange,
  className,
}: {
  name: string;
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex min-w-0 flex-wrap gap-1 border-b border-border", className)}
    >
      {items.map((item) => (
        <label
          key={item.id}
          className="relative -mb-px cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted transition-colors duration-200 has-[:checked]:border-accent has-[:checked]:text-foreground"
        >
          <input
            type="radio"
            name={name}
            value={item.id}
            checked={value === item.id}
            onChange={() => onChange(item.id)}
            className="peer sr-only"
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

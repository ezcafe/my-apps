import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export type TableAlign = "start" | "end";

/** Sticky freeze slot: leading edge, or after a w-10 checkbox column. */
export type TableFreeze = "leading" | "afterCheckbox";

export type TableSortDirection = "asc" | "desc" | "none";

const cellPad = "px-4 py-3";

export function tableAlignClass(align: TableAlign = "start"): string {
  return align === "end" ? "text-right" : "text-left";
}

export function tableFreezeClass(freeze?: TableFreeze): string | undefined {
  if (freeze === "leading") {
    return "sticky left-0 z-10";
  }
  if (freeze === "afterCheckbox") {
    return "sticky left-10 z-10";
  }
  return undefined;
}

export function tableSortAria(
  direction: TableSortDirection,
): "ascending" | "descending" | "none" {
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}

const freezeBg =
  "bg-surface group-hover/row:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] group-data-[selected]/row:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] group-data-[accent]/row:bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]";

const freezeHeadBg = "bg-muted-surface";

export function Table({
  children,
  className,
  maxHeight,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  maxHeight?: string | number;
}) {
  const constrained = maxHeight != null;
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-border",
        constrained ? "overflow-auto" : "overflow-x-auto",
        className,
      )}
      style={
        constrained
          ? {
              maxHeight:
                typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
            }
          : undefined
      }
      {...props}
    >
      <table className="min-w-full divide-y divide-border text-left text-base">
        {children}
      </table>
    </div>
  );
}

export function TableCaption({
  children,
  className,
  visuallyHidden = true,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement> & {
  visuallyHidden?: boolean;
}) {
  return (
    <caption
      className={cn(visuallyHidden ? "sr-only" : "px-4 py-2 text-sm text-muted", className)}
      {...props}
    >
      {children}
    </caption>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-muted-surface", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "sticky bottom-0 z-20 border-t border-border bg-muted-surface",
        className,
      )}
      {...props}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  children,
  className,
  selected,
  accent,
  clickable,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
  accent?: boolean;
  clickable?: boolean;
}) {
  return (
    <tr
      data-selected={selected ? "" : undefined}
      data-accent={accent ? "" : undefined}
      className={cn(
        "group/row transition-colors duration-150",
        "hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]",
        selected &&
          "bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
        accent &&
          !selected &&
          "bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
        clickable && "cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
  align = "start",
  freeze,
  ...props
}: Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: TableAlign;
  freeze?: TableFreeze;
}) {
  return (
    <th
      scope="col"
      className={cn(
        cellPad,
        "sticky top-0 z-20 font-medium",
        tableAlignClass(align),
        tableFreezeClass(freeze),
        freeze ? cn(freezeHeadBg, "z-30") : "bg-muted-surface",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  align = "start",
  freeze,
  numeric,
  ...props
}: Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: TableAlign;
  freeze?: TableFreeze;
  /** Prefer for quantitative amounts; pairs with align="end". */
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        cellPad,
        "align-middle",
        tableAlignClass(align),
        numeric && "tabular-nums",
        tableFreezeClass(freeze),
        freeze && freezeBg,
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableSortButton({
  children,
  direction = "none",
  align = "start",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  direction?: TableSortDirection;
  align?: TableAlign;
}) {
  const indicator =
    direction === "asc" ? " ↑" : direction === "desc" ? " ↓" : "";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] fx-press",
        align === "end" && "w-full justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {indicator ? <span aria-hidden>{indicator}</span> : null}
    </button>
  );
}

/**
 * Row actions: always visible on coarse pointers; hover-reveal on fine pointers.
 * Stays visible when the row contains focus (`focus-within`).
 */
export function TableRowActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        "opacity-100",
        "[@media(hover:hover)]:opacity-0",
        "[@media(hover:hover)]:group-hover/row:opacity-100",
        "[@media(hover:hover)]:group-focus-within/row:opacity-100",
        "transition-[opacity] duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}

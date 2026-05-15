"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

export type MultiSelectItem = { id: string; label: string };
export type MultiSelectGroup = {
  id: string;
  label: string;
  items: MultiSelectItem[];
};

type MultiSelectProps = {
  /** Flat item list. Provide either `items` or `groups`. */
  items?: MultiSelectItem[];
  /** Grouped item list (renders headers above each group). */
  groups?: MultiSelectGroup[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyHint?: ReactNode;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

/**
 * Token-driven multi-select with chip trigger and checkbox popover.
 * Use inside a `Field` for label + focus underline. Pass either `items` or `groups`.
 */
export function MultiSelect({
  items,
  groups,
  value,
  onChange,
  placeholder = "Select…",
  searchable = true,
  searchPlaceholder = "Search…",
  emptyHint,
  className,
  triggerClassName,
  panelClassName,
  disabled,
  "aria-label": ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `${id}-label`;

  const flatItems = useMemo<MultiSelectItem[]>(() => {
    if (groups) return groups.flatMap((g) => g.items);
    return items ?? [];
  }, [groups, items]);

  const itemById = useMemo(() => {
    return new Map(flatItems.map((i) => [i.id, i] as const));
  }, [flatItems]);

  const selected = useMemo(() => {
    return value
      .map((v) => itemById.get(v))
      .filter((i): i is MultiSelectItem => i != null);
  }, [value, itemById]);

  const filteredFlat = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return flatItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [flatItems, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

  const toggle = (itemId: string) => {
    if (value.includes(itemId)) onChange(value.filter((v) => v !== itemId));
    else onChange([...value, itemId]);
  };

  const clearAll = () => onChange([]);

  const renderItem = (item: MultiSelectItem) => {
    const checked = value.includes(item.id);
    return (
      <label
        key={item.id}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted-surface fx-press",
          checked && "bg-muted-surface",
        )}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={() => toggle(item.id)}
        />
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background transition-colors duration-150",
            checked && "border-foreground bg-foreground text-background",
          )}
        >
          {checked ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3">
              <path
                fillRule="evenodd"
                d="M16.704 5.296a1 1 0 0 1 0 1.408l-7.5 7.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L8.5 12.086l6.793-6.79a1 1 0 0 1 1.411 0Z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </label>
    );
  };

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <button
        type="button"
        id={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        className={cn(
          "flex w-full min-h-10 min-w-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background px-2 py-1.5 text-left text-sm text-foreground antialiased outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-45",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {selected.length === 0 ? (
            <span className="text-muted">{placeholder}</span>
          ) : (
            selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-muted-surface px-1.5 py-0.5 text-xs font-medium text-foreground fx-press"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggle(s.id);
                }}
                role="button"
                aria-label={`Remove ${s.label}`}
              >
                <span className="max-w-[10rem] truncate">{s.label}</span>
                <CloseIcon className="size-3" />
              </span>
            ))
          )}
        </span>
        {selected.length > 0 ? (
          <span
            role="button"
            aria-label="Clear all"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              clearAll();
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] p-1 text-muted transition-colors duration-150 hover:bg-muted-surface hover:text-foreground"
          >
            <CloseIcon className="size-3.5" />
          </span>
        ) : null}
        <ChevronIcon
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={labelId}
          className={cn(
            "absolute z-50 mt-1 w-full max-w-[min(100vw-2rem,28rem)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-md)] fx-fade-in",
            panelClassName,
          )}
        >
          {searchable ? (
            <div className="border-b border-border p-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 py-1.5 text-sm text-foreground antialiased outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          ) : null}
          <div className="max-h-72 overflow-auto p-1">
            {flatItems.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted">
                {emptyHint ?? "Nothing to choose"}
              </p>
            ) : filteredFlat ? (
              filteredFlat.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted">
                  No matches
                </p>
              ) : (
                filteredFlat.map(renderItem)
              )
            ) : groups ? (
              groups.map((g) => (
                <div key={g.id} className="mb-1 last:mb-0">
                  <p className="px-2 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                    {g.label}
                  </p>
                  {g.items.map(renderItem)}
                </div>
              ))
            ) : (
              (items ?? []).map(renderItem)
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

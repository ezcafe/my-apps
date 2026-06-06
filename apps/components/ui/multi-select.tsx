"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const subscribeNoop = () => () => {};
const getServerMounted = () => false;
const getClientMounted = () => true;

const supportsPopover =
  typeof HTMLElement !== "undefined" &&
  typeof HTMLElement.prototype.showPopover === "function";

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
  /** Render the panel inline instead of portaling to `document.body`. */
  disablePortal?: boolean;
  "aria-label"?: string;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
  placement: "below" | "above";
  listMaxHeight: number;
  /** `absolute` when portaled into `<dialog>` (fixed uses dialog as containing block). */
  strategy: "fixed" | "absolute";
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

function hidePanelPopover(panel: HTMLElement | null) {
  if (!panel || !supportsPopover) return;
  try {
    panel.hidePopover();
  } catch {
    /* not open */
  }
}

function showPanelPopover(panel: HTMLElement | null) {
  if (!panel || !supportsPopover) return;
  try {
    panel.showPopover();
  } catch {
    /* already open */
  }
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
  disablePortal = false,
  "aria-label": ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientMounted,
    getServerMounted,
  );

  const inModal = panelHost?.tagName === "DIALOG";
  const usePopoverLayer = supportsPopover && panelHost === document.body;

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const listCap = 288;
    const minList = 80;
    const searchChrome = searchable ? 52 : 0;
    const panelChrome = 2;
    const minPanel = searchChrome + minList + panelChrome;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const placeBelow =
      spaceBelow >= minPanel || spaceBelow >= spaceAbove;
    const placement = placeBelow ? "below" : "above";
    const available = placeBelow ? spaceBelow : spaceAbove;
    const listMaxHeight = Math.max(
      minList,
      Math.min(listCap, available - searchChrome - panelChrome),
    );

    const dialog = trigger.closest("dialog");
    const host = disablePortal ? rootRef.current ?? document.body : dialog ?? document.body;

    if (disablePortal && rootRef.current) {
      setPanelHost(host);
      setPanelPos({
        top: placeBelow
          ? trigger.offsetTop + trigger.offsetHeight + gap
          : trigger.offsetTop - gap,
        left: trigger.offsetLeft,
        width: Math.max(rect.width, 16 * 16),
        placement,
        listMaxHeight,
        strategy: "absolute",
      });
      return;
    }

    if (dialog) {
      const dialogRect = dialog.getBoundingClientRect();
      setPanelHost(host);
      setPanelPos({
        top: placeBelow
          ? rect.bottom - dialogRect.top + gap
          : rect.top - dialogRect.top - gap,
        left: rect.left - dialogRect.left,
        width: rect.width,
        placement,
        listMaxHeight,
        strategy: "absolute",
      });
      return;
    }

    setPanelHost(host);
    setPanelPos({
      top: placeBelow ? rect.bottom + gap : rect.top - gap,
      left: rect.left,
      width: rect.width,
      placement,
      listMaxHeight,
      strategy: "fixed",
    });
  }, [disablePortal, searchable]);

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
    hidePanelPopover(panelRef.current);
    setOpen(false);
    setQuery("");
  };

  useLayoutEffect(() => {
    if (!open) {
      hidePanelPopover(panelRef.current);
      setPanelPos(null);
      setPanelHost(null);
      return;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useLayoutEffect(() => {
    if (!open || !panelPos || !usePopoverLayer) return;
    showPanelPopover(panelRef.current);
  }, [open, panelPos, usePopoverLayer]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !panelPos || !searchable) return;
    queueMicrotask(() => searchRef.current?.focus());
  }, [open, panelPos, searchable]);

  const toggle = (itemId: string) => {
    if (value.includes(itemId)) onChange(value.filter((v) => v !== itemId));
    else onChange([...value, itemId]);
  };

  const clearAll = () => onChange([]);

  const stopPanelEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const renderItem = (item: MultiSelectItem) => {
    const checked = value.includes(item.id);
    return (
      <button
        key={item.id}
        type="button"
        role="option"
        aria-selected={checked}
        onClick={() => toggle(item.id)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted-surface fx-press",
          checked && "bg-muted-surface",
        )}
      >
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
      </button>
    );
  };

  const panel =
    open && panelPos && panelHost ? (
      <div
        ref={panelRef}
        {...(usePopoverLayer ? { popover: "manual" as const } : {})}
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={labelId}
        style={{
          position: panelPos.strategy,
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          transform:
            panelPos.placement === "above" ? "translateY(-100%)" : undefined,
          margin: 0,
        }}
        className={cn(
          "pointer-events-auto max-w-[min(100vw-2rem,28rem)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-md)]",
          inModal && "z-[60]",
          !usePopoverLayer && !inModal && "z-[100]",
          panelClassName,
        )}
        onPointerDown={stopPanelEvent}
        onClick={stopPanelEvent}
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
        <div
          className="overflow-auto p-1"
          style={{ maxHeight: panelPos.listMaxHeight }}
        >
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
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <button
        ref={triggerRef}
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

      {mounted && panel && panelHost
        ? disablePortal
          ? panel
          : createPortal(panel, panelHost)
        : null}
    </div>
  );
}

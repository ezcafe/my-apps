"use client";

import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import type {
  SettingsCategoryMeta,
  SettingsIconComponent,
} from "./settings-types";

// Standard icon components
function IconPalette(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M10 2a8 8 0 1 0 0 16 2.5 2.5 0 0 0 2.5-2.5c0-.68-.27-1.3-.7-1.75-.43-.44-.7-1.07-.7-1.75a2.5 2.5 0 0 1 2.5-2.5H15a3 3 0 0 0 3-3c0-4.42-3.58-8-8-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="6.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="9.5" cy="5.5" r="1" fill="currentColor" />
      <circle cx="13.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect
        x="3"
        y="4"
        width="14"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8h14M7 2.5v3M13 2.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <circle cx="10" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 16.5c0-3.04 2.69-5.5 6-5.5s6 2.46 6 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWorkspaces(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect
        x="3"
        y="3.5"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="3.5"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="11.5"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11.5"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconKey(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m11 11 6 6m-2-4 2 2m-3.5.5 1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAlertTriangle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="m10 3 7.5 13H2.5L10 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8v3.5M10 14v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLayers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="m10 2.5 7.5 4-7.5 4-7.5-4 7.5-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m2.5 10 7.5 4 7.5-4M2.5 13.5 10 17.5l7.5-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSliders(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M3 5h8m4 0h2M3 10h2m4 0h8M3 15h11m4 0h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="13" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCopy(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <rect
        x="6"
        y="6"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5V4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconFileImport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M4 3.5A1.5 1.5 0 0 1 5.5 2h6.25a1.5 1.5 0 0 1 1.06.44l3.75 3.75a1.5 1.5 0 0 1 .44 1.06V16.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 16.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 8.5v6m-2.5-3.5 2.5-2.5 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrendingUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="m3 14 5-5 3.5 3.5L17 6m0 0h-4.5M17 6v4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBuildingBank(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M2.5 8 10 3.5 17.5 8H2.5ZM4 8v6.5M8 8v6.5M12 8v6.5M16 8v6.5M2 17h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M10 2.5a5.5 5.5 0 0 0-5.5 5.5c0 2.5-1.5 4.5-2 5h15c-.5-.5-2-2.5-2-5A5.5 5.5 0 0 0 10 2.5ZM8 16a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const DEFAULT_CATEGORY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  // App
  appearance: IconPalette,
  "date-format": IconCalendar,
  account: IconUser,
  workspaces: IconWorkspaces,
  "api-tokens": IconKey,
  "danger-zone": IconAlertTriangle,
  // Money
  ledger: IconLayers,
  menu: IconSliders,
  clone: IconCopy,
  // Investments
  import: IconFileImport,
  instruments: IconTrendingUp,
  // Loans
  notifications: IconBell,
};

type Props<T extends string = string> = {
  categories: SettingsCategoryMeta<T>[];
  activeCategory: T | "all";
  onSelectCategory: (id: T | "all") => void;
  matchCounts?: Partial<Record<T, number>>;
  isSearching?: boolean;
  className?: string;
};

export function SettingsSidebar<T extends string = string>({
  categories,
  activeCategory,
  onSelectCategory,
  matchCounts,
  isSearching,
  className,
}: Props<T>) {
  return (
    <aside
      className={cn(
        "w-full md:w-52 lg:w-56 shrink-0 md:sticky md:top-6 md:self-start z-10",
        className,
      )}
    >
      {/* Mobile horizontal category list (< md) */}
      <nav
        aria-label="Settings categories"
        className="flex md:hidden w-full overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none gap-1.5"
      >
        {isSearching ? (
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors fx-press",
              activeCategory === "all"
                ? "bg-foreground text-background"
                : "bg-surface text-muted hover:bg-muted-surface hover:text-foreground",
            )}
          >
            All matches
          </button>
        ) : null}
        {categories.map((cat) => {
          const Icon = cat.icon || DEFAULT_CATEGORY_ICONS[cat.id] || IconLayers;
          const isActive = activeCategory === cat.id;
          const count = matchCounts?.[cat.id];
          const isDanger = cat.isDanger || cat.id === "danger-zone";

          if (isSearching && count === 0) {
            return null;
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors fx-press",
                isActive
                  ? isDanger
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-foreground text-background"
                  : isDanger
                    ? "bg-surface text-destructive/80 hover:bg-destructive-muted-bg hover:text-destructive"
                    : "bg-surface text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{cat.label}</span>
              {isSearching && count != null ? (
                <span
                  className={cn(
                    "rounded-[var(--radius-sm)] px-1 py-0.2 text-[10px] font-mono",
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-muted-surface text-muted",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Desktop vertical sidebar (md+) */}
      <nav
        aria-label="Settings navigation"
        className="hidden md:flex flex-col gap-1 w-full"
      >
        {isSearching ? (
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={cn(
              "flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors text-left fx-press",
              activeCategory === "all"
                ? "bg-muted-surface text-foreground font-semibold"
                : "text-muted hover:bg-muted-surface/60 hover:text-foreground",
            )}
          >
            <span>All matches</span>
          </button>
        ) : null}

        {categories.map((cat) => {
          const Icon = cat.icon || DEFAULT_CATEGORY_ICONS[cat.id] || IconLayers;
          const isActive = activeCategory === cat.id;
          const count = matchCounts?.[cat.id];
          const isDanger = cat.isDanger || cat.id === "danger-zone";

          if (isSearching && count === 0) {
            return null;
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "group flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors text-left fx-press",
                isActive
                  ? isDanger
                    ? "bg-destructive-muted-bg text-destructive font-semibold"
                    : "bg-muted-surface text-foreground font-semibold"
                  : isDanger
                    ? "text-destructive/80 hover:bg-destructive-muted-bg/60 hover:text-destructive"
                    : "text-muted hover:bg-muted-surface/60 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? isDanger
                        ? "text-destructive"
                        : "text-accent"
                      : isDanger
                        ? "text-destructive/70"
                        : "text-muted group-hover:text-foreground",
                  )}
                />
                <span className="truncate">{cat.label}</span>
              </span>

              {isSearching && count != null ? (
                <span
                  className={cn(
                    "ml-2 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs font-mono tabular-nums",
                    isActive
                      ? "bg-background text-foreground shadow-xs"
                      : "bg-muted-surface text-muted",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

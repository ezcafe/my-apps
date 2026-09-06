"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SettingsSearchBar } from "./settings-search-bar";
import { SettingsSidebar } from "./settings-sidebar";
import {
  filterSettingsCategories,
  type SettingsCategoryMeta,
} from "./settings-types";
import { Button } from "@/components/ui/button";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { cn } from "@/lib/cn";

export type SettingsPageLayoutProps<T extends string = string> = {
  categories: SettingsCategoryMeta<T>[];
  sections: Partial<Record<T, ReactNode>>;
  defaultCategory?: T;
  searchPlaceholder?: string;
  topAlert?: ReactNode;
  headerExtra?: ReactNode;
  idPrefix?: string;
  className?: string;
};

export function SettingsPageLayout<T extends string = string>({
  categories,
  sections,
  defaultCategory,
  searchPlaceholder = "Search settings…",
  topAlert,
  headerExtra,
  idPrefix = "settings",
  className,
}: SettingsPageLayoutProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const fallbackDefault = defaultCategory || categories[0]?.id;

  const [activeCategory, setActiveCategory] = useState<T | "all">(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const rawHash = window.location.hash.replace(/^#/, "");
      // Support both `#id` and `#${idPrefix}-id`
      const normalizedHash = rawHash.startsWith(`${idPrefix}-`)
        ? rawHash.slice(idPrefix.length + 1)
        : rawHash;
      if (categories.some((cat) => cat.id === normalizedHash)) {
        return normalizedHash as T;
      }
    }
    return fallbackDefault;
  });

  // Scroll to initial hash target on mount if present
  useEffect(() => {
    const rawHash = window.location.hash.replace(/^#/, "");
    if (rawHash) {
      const target =
        document.getElementById(rawHash) ||
        document.getElementById(`${idPrefix}-${rawHash}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [idPrefix]);

  const isSearching = searchQuery.trim().length > 0;

  const { matchingCategories, matchCounts } = useMemo(
    () => filterSettingsCategories(searchQuery, categories),
    [searchQuery, categories],
  );

  const handleSelectCategory = useCallback(
    (id: T | "all") => {
      setActiveCategory(id);
      if (id !== "all") {
        window.history.replaceState(null, "", `#${idPrefix}-${id}`);
        const el =
          document.getElementById(`${idPrefix}-${id}`) ||
          document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [idPrefix],
  );

  const hasMatches = matchingCategories.length > 0;

  return (
    <div className={cn(SHELL_FULL_SPAN, "space-y-6", className)}>
      {topAlert}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        {/* Left Sticky Navigation Sidebar */}
        <SettingsSidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          matchCounts={isSearching ? matchCounts : undefined}
          isSearching={isSearching}
        />

        {/* Center/Main Settings Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          {/* Optional Header Extra (e.g., active workspace badge, subtitle) */}
          {headerExtra}

          {/* Top Search bar aligned with center content column */}
          <div className="w-full max-w-2xl">
            <SettingsSearchBar
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                if (q.trim() && activeCategory !== "all") {
                  setActiveCategory("all");
                }
              }}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* Search Result Summary / Clear button */}
          {isSearching && (
            <div className="flex items-center justify-between pb-2 border-b border-border text-xs text-muted">
              <span>
                {hasMatches
                  ? `Showing ${matchingCategories.length} matching section${matchingCategories.length === 1 ? "" : "s"}`
                  : `No settings matching "${searchQuery}"`}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-accent hover:underline font-medium"
              >
                Clear filter
              </button>
            </div>
          )}

          {!hasMatches ? (
            <div className="py-12 text-center rounded-[var(--radius-md)] border border-dashed border-border bg-surface p-8 space-y-3">
              <p className="text-base font-medium text-foreground">
                No matching settings found
              </p>
              <p className="text-sm text-muted max-w-sm mx-auto">
                We couldn&apos;t find any settings matching &ldquo;{searchQuery}&rdquo;.
              </p>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </div>
            </div>
          ) : (
            matchingCategories.map((cat) => {
              const content = sections[cat.id];
              if (!content) return null;
              return (
                <div
                  key={cat.id}
                  id={`${idPrefix}-${cat.id}`}
                  className="scroll-mt-20 space-y-4"
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

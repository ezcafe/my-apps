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
  parseSettingsCategoryFromHash,
  resolveVisibleSettingsCategories,
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
    if (typeof window !== "undefined") {
      const fromHash = parseSettingsCategoryFromHash(
        window.location.hash,
        idPrefix,
        categories,
      );
      if (fromHash) return fromHash;
    }
    return fallbackDefault;
  });

  const [lastConcreteCategory, setLastConcreteCategory] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const fromHash = parseSettingsCategoryFromHash(
        window.location.hash,
        idPrefix,
        categories,
      );
      if (fromHash) return fromHash;
    }
    return fallbackDefault as T;
  });

  const isSearching = searchQuery.trim().length > 0;

  const { matchingCategories, matchCounts } = useMemo(
    () => filterSettingsCategories(searchQuery, categories),
    [searchQuery, categories],
  );

  const visibleCategories = useMemo(
    () =>
      resolveVisibleSettingsCategories({
        isSearching,
        matchingCategories,
        activeCategory,
        categories,
        fallbackCategoryId: lastConcreteCategory,
      }),
    [
      isSearching,
      matchingCategories,
      activeCategory,
      categories,
      lastConcreteCategory,
    ],
  );

  const handleSelectCategory = useCallback(
    (id: T | "all") => {
      setActiveCategory(id);
      if (id !== "all") {
        setLastConcreteCategory(id);
        setSearchQuery("");
        window.history.replaceState(null, "", `#${idPrefix}-${id}`);
      }
    },
    [idPrefix],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveCategory(lastConcreteCategory);
    window.history.replaceState(
      null,
      "",
      `#${idPrefix}-${lastConcreteCategory}`,
    );
  }, [idPrefix, lastConcreteCategory]);

  // Sync hash → category on browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const fromHash = parseSettingsCategoryFromHash(
        window.location.hash,
        idPrefix,
        categories,
      );
      if (fromHash) {
        setActiveCategory(fromHash);
        setLastConcreteCategory(fromHash);
        setSearchQuery("");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [categories, idPrefix]);

  const hasMatches = visibleCategories.length > 0;

  return (
    <div className={cn(SHELL_FULL_SPAN, "space-y-6", className)}>
      {topAlert}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">
        <SettingsSidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          matchCounts={isSearching ? matchCounts : undefined}
          isSearching={isSearching}
        />

        <div className="flex-1 min-w-0 w-full space-y-8">
          {headerExtra}

          <div className="w-full max-w-2xl">
            <SettingsSearchBar
              value={searchQuery}
              onChange={(q) => {
                setSearchQuery(q);
                if (q.trim()) {
                  if (activeCategory !== "all") {
                    setActiveCategory("all");
                  }
                } else {
                  setActiveCategory(lastConcreteCategory);
                }
              }}
              placeholder={searchPlaceholder}
            />
          </div>

          {isSearching && (
            <div className="flex items-center justify-between pb-2 border-b border-border text-xs text-muted">
              <span>
                {hasMatches
                  ? `Showing ${visibleCategories.length} matching section${visibleCategories.length === 1 ? "" : "s"}`
                  : `No settings matching "${searchQuery}"`}
              </span>
              <button
                type="button"
                onClick={clearSearch}
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
                We couldn&apos;t find any settings matching &ldquo;{searchQuery}
                &rdquo;.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={clearSearch}>
                  Clear search
                </Button>
              </div>
            </div>
          ) : (
            visibleCategories.map((cat) => {
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

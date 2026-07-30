"use client";

import { useSyncExternalStore } from "react";

export const MONEY_SECTION_TABS_STORAGE_KEY = "money_section_tabs";

export const MONEY_OPTIONAL_SECTION_TAB_KEYS = [
  "bills",
  "savings",
  "loans",
  "investments",
  "import",
] as const;

export type MoneyOptionalSectionTabKey =
  (typeof MONEY_OPTIONAL_SECTION_TAB_KEYS)[number];

export type MoneySectionTabVisibility = Record<
  MoneyOptionalSectionTabKey,
  boolean
>;

export const DEFAULT_MONEY_SECTION_TAB_VISIBILITY: MoneySectionTabVisibility = {
  bills: false,
  savings: false,
  loans: false,
  investments: false,
  import: false,
};

export const MONEY_OPTIONAL_SECTION_TAB_LABELS: Record<
  MoneyOptionalSectionTabKey,
  string
> = {
  bills: "Bills",
  savings: "Savings",
  loans: "Loans",
  investments: "Invest",
  import: "Import",
};

const CHANGE_EVENT = "money-section-tabs-change";

function isOptionalKey(key: string): key is MoneyOptionalSectionTabKey {
  return (MONEY_OPTIONAL_SECTION_TAB_KEYS as readonly string[]).includes(key);
}

/** Parse stored JSON into a full visibility map; unknown keys ignored; non-booleans coerced. */
export function parseMoneySectionTabVisibility(
  raw: string | null | undefined,
): MoneySectionTabVisibility {
  const result: MoneySectionTabVisibility = {
    ...DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
  };
  if (raw == null || raw === "") return result;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return result;
    }
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isOptionalKey(key)) continue;
      result[key] = value === true;
    }
  } catch {
    /* ignore invalid JSON */
  }
  return result;
}

export function serializeMoneySectionTabVisibility(
  visibility: MoneySectionTabVisibility,
): string {
  const normalized: MoneySectionTabVisibility = {
    ...DEFAULT_MONEY_SECTION_TAB_VISIBILITY,
  };
  for (const key of MONEY_OPTIONAL_SECTION_TAB_KEYS) {
    normalized[key] = visibility[key] === true;
  }
  return JSON.stringify(normalized);
}

export function readMoneySectionTabVisibility(): MoneySectionTabVisibility {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MONEY_SECTION_TAB_VISIBILITY };
  }
  try {
    return parseMoneySectionTabVisibility(
      localStorage.getItem(MONEY_SECTION_TABS_STORAGE_KEY),
    );
  } catch {
    return { ...DEFAULT_MONEY_SECTION_TAB_VISIBILITY };
  }
}

function emitMoneySectionTabVisibilityChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function writeMoneySectionTabVisibility(
  visibility: MoneySectionTabVisibility,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      MONEY_SECTION_TABS_STORAGE_KEY,
      serializeMoneySectionTabVisibility(visibility),
    );
  } catch {
    /* ignore quota / private mode */
  }
  emitMoneySectionTabVisibilityChange();
}

export function setMoneySectionTabVisible(
  key: MoneyOptionalSectionTabKey,
  visible: boolean,
): void {
  const next = readMoneySectionTabVisibility();
  next[key] = visible;
  writeMoneySectionTabVisibility(next);
}

export function subscribeMoneySectionTabVisibility(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === MONEY_SECTION_TABS_STORAGE_KEY || e.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

let cachedSnapshot: MoneySectionTabVisibility =
  DEFAULT_MONEY_SECTION_TAB_VISIBILITY;
let cachedSerialized = serializeMoneySectionTabVisibility(cachedSnapshot);

function getMoneySectionTabVisibilitySnapshot(): MoneySectionTabVisibility {
  const next = readMoneySectionTabVisibility();
  const serialized = serializeMoneySectionTabVisibility(next);
  if (serialized === cachedSerialized) return cachedSnapshot;
  cachedSnapshot = next;
  cachedSerialized = serialized;
  return cachedSnapshot;
}

function getServerMoneySectionTabVisibilitySnapshot(): MoneySectionTabVisibility {
  return DEFAULT_MONEY_SECTION_TAB_VISIBILITY;
}

export function useMoneySectionTabVisibility(): {
  visibility: MoneySectionTabVisibility;
  setVisible: (key: MoneyOptionalSectionTabKey, visible: boolean) => void;
  isTabVisible: (key: MoneyOptionalSectionTabKey | undefined) => boolean;
} {
  const visibility = useSyncExternalStore(
    subscribeMoneySectionTabVisibility,
    getMoneySectionTabVisibilitySnapshot,
    getServerMoneySectionTabVisibilitySnapshot,
  );

  function setVisible(key: MoneyOptionalSectionTabKey, visible: boolean) {
    setMoneySectionTabVisible(key, visible);
  }

  function isTabVisible(key: MoneyOptionalSectionTabKey | undefined) {
    if (key == null) return true;
    return visibility[key] === true;
  }

  return { visibility, setVisible, isTabVisible };
}

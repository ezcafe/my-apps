"use client";

import { useSyncExternalStore } from "react";
import { BABY_LOCALE_CHANGE_EVENT } from "@/components/baby-locale-provider";
import {
  BABY_LOCALE_COOKIE,
  BABY_LOCALE_STORAGE_KEY,
  parseBabyLocale,
  t as babyT,
  type BabyLocale,
} from "@/lib/baby-i18n";

function readCookieLocale(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${BABY_LOCALE_COOKIE}=`));
  return match ? match.slice(BABY_LOCALE_COOKIE.length + 1) : null;
}

function readBabyLocale(): BabyLocale {
  try {
    const fromStorage = localStorage.getItem(BABY_LOCALE_STORAGE_KEY);
    if (fromStorage) return parseBabyLocale(fromStorage);
  } catch {
    /* ignore */
  }
  return parseBabyLocale(readCookieLocale());
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(BABY_LOCALE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(BABY_LOCALE_CHANGE_EVENT, onChange);
  };
}

/** Live Baby Care nav label (EN/VI) from cookie/storage. */
export function useBabyNavLabel(fallback = "Baby Care"): string {
  const locale = useSyncExternalStore(
    subscribe,
    readBabyLocale,
    () => "en" as BabyLocale,
  );
  return babyT("nav.label", locale) || fallback;
}

export function shellItemLabel(
  item: { id: string; label: string },
  babyLabel: string,
): string {
  return item.id === "baby" ? babyLabel : item.label;
}

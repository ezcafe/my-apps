"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  BABY_LOCALE_COOKIE,
  BABY_LOCALE_STORAGE_KEY,
  parseBabyLocale,
  t as translate,
  type BabyLocale,
} from "@/lib/baby-i18n";

export const BABY_LOCALE_CHANGE_EVENT = "baby-locale-change";

type BabyLocaleContextValue = {
  locale: BabyLocale;
  setLocale: (locale: BabyLocale) => void;
  t: (key: string) => string;
};

const BabyLocaleContext = createContext<BabyLocaleContextValue | null>(null);

function persistLocale(locale: BabyLocale) {
  try {
    localStorage.setItem(BABY_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${BABY_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(BABY_LOCALE_CHANGE_EVENT, { detail: locale }),
    );
  } catch {
    /* ignore */
  }
}

export function BabyLocaleProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: BabyLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<BabyLocale>(() =>
    parseBabyLocale(initialLocale),
  );

  const setLocale = useCallback((next: BabyLocale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(key, locale),
    }),
    [locale, setLocale],
  );

  return (
    <BabyLocaleContext.Provider value={value}>
      {children}
    </BabyLocaleContext.Provider>
  );
}

export function useBabyLocale() {
  const ctx = useContext(BabyLocaleContext);
  if (!ctx) {
    throw new Error("useBabyLocale must be used within BabyLocaleProvider");
  }
  return ctx;
}

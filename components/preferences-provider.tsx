"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  DATE_FORMAT_COOKIE,
  DATE_FORMAT_STORAGE_KEY,
  type DateFormat,
  parseDateFormat,
} from "@/lib/date-format-preference";

export type { DateFormat };

type PreferencesContextValue = {
  dateFormat: DateFormat;
  setDateFormat: (f: DateFormat) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function persistDateFormat(f: DateFormat) {
  try {
    localStorage.setItem(DATE_FORMAT_STORAGE_KEY, f);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${DATE_FORMAT_COOKIE}=${f}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function PreferencesProvider({
  initialDateFormat = "locale",
  children,
}: {
  initialDateFormat?: DateFormat;
  children: React.ReactNode;
}) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>(
    () => parseDateFormat(initialDateFormat),
  );

  const setDateFormat = useCallback((f: DateFormat) => {
    setDateFormatState(f);
    persistDateFormat(f);
  }, []);

  const value = useMemo(
    () => ({ dateFormat, setDateFormat }),
    [dateFormat, setDateFormat],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}

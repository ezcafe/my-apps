"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type DateFormat = "locale" | "mdy" | "dmy" | "ymd";

const STORAGE_DATE_FORMAT_KEY = "workspace_date_format";

const DATE_FORMAT_ORDER: DateFormat[] = ["locale", "mdy", "dmy", "ymd"];

function readStoredDateFormat(): DateFormat {
  if (typeof window === "undefined") return "locale";
  try {
    const s = localStorage.getItem(STORAGE_DATE_FORMAT_KEY);
    if (s != null && DATE_FORMAT_ORDER.includes(s as DateFormat)) {
      return s as DateFormat;
    }
  } catch {
    /* ignore */
  }
  return "locale";
}

type PreferencesContextValue = {
  dateFormat: DateFormat;
  setDateFormat: (f: DateFormat) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>(() =>
    typeof window !== "undefined" ? readStoredDateFormat() : "locale",
  );

  const setDateFormat = useCallback((f: DateFormat) => {
    setDateFormatState(f);
    try {
      localStorage.setItem(STORAGE_DATE_FORMAT_KEY, f);
    } catch {
      /* ignore */
    }
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

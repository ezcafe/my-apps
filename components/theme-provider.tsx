"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LEGACY_THEME_STORAGE_KEY,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme-init-script";

export type Theme = ThemePreference;
export type StylePreset = "quiet";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    let s = localStorage.getItem(THEME_STORAGE_KEY);
    if (s == null || s === "") {
      const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      if (legacy === "light" || legacy === "dark" || legacy === "system") {
        localStorage.setItem(THEME_STORAGE_KEY, legacy);
        try {
          localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        s = legacy;
      }
    }
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {
    /* ignore */
  }
  return "system";
}

function resolveStoredTheme(): ResolvedTheme {
  const theme = readStoredTheme();
  if (typeof window === "undefined") return "light";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveThemePreference(theme, prefersDark);
}

function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function applyStyleDataset() {
  document.documentElement.dataset.style = "quiet";
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: ResolvedTheme;
  style: StylePreset;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : "system",
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof window !== "undefined" ? resolveStoredTheme() : "light",
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () => {
      const r = resolveThemePreference(theme, mq.matches);
      setResolved(r);
      applyThemeClass(r);
    };
    compute();
    mq.addEventListener("change", compute);
    return () => mq.removeEventListener("change", compute);
  }, [theme]);

  useEffect(() => {
    applyStyleDataset();
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolved, style: "quiet" as const }),
    [theme, setTheme, resolved],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

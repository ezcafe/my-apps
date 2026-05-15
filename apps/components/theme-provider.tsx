"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "system" | "light" | "dark";

export type StylePreset = "linear" | "apple" | "swiss" | "notion";

const STORAGE_KEY = "workspace_theme";
const LEGACY_STORAGE_KEY = "money_theme";
const STORAGE_STYLE_KEY = "workspace_style";

const STYLE_ORDER: StylePreset[] = ["linear", "apple", "swiss", "notion"];

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    let s = localStorage.getItem(STORAGE_KEY);
    if (s == null || s === "") {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === "light" || legacy === "dark" || legacy === "system") {
        localStorage.setItem(STORAGE_KEY, legacy);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
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

function readStoredStyle(): StylePreset {
  if (typeof window === "undefined") return "linear";
  try {
    const s = localStorage.getItem(STORAGE_STYLE_KEY);
    if (s != null && STYLE_ORDER.includes(s as StylePreset)) return s as StylePreset;
  } catch {
    /* ignore */
  }
  return "linear";
}

function applyThemeClass(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function applyStyleDataset(style: StylePreset) {
  document.documentElement.dataset.style = style;
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
  style: StylePreset;
  setStyle: (s: StylePreset) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : "system",
  );
  const [style, setStyleState] = useState<StylePreset>(() =>
    typeof window !== "undefined" ? readStoredStyle() : "linear",
  );
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = () => {
      const r =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      queueMicrotask(() => {
        setResolved(r);
        applyThemeClass(r);
      });
    };
    compute();
    mq.addEventListener("change", compute);
    return () => mq.removeEventListener("change", compute);
  }, [theme]);

  useEffect(() => {
    applyStyleDataset(style);
  }, [style]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const setStyle = useCallback((s: StylePreset) => {
    setStyleState(s);
    try {
      localStorage.setItem(STORAGE_STYLE_KEY, s);
    } catch {
      /* ignore */
    }
    applyStyleDataset(s);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolved, style, setStyle }),
    [theme, setTheme, resolved, style, setStyle],
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

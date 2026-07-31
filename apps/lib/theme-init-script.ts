/** Keys shared with ThemeProvider and the pre-paint inline script. */
export const THEME_STORAGE_KEY = "workspace_theme";
export const LEGACY_THEME_STORAGE_KEY = "money_theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function resolveThemePreference(
  theme: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

/**
 * Blocking inline script for <head> — applies theme class before body paint.
 * Must stay in sync with readStoredTheme / resolveThemePreference in ThemeProvider.
 */
export function themeInitInlineScript(): string {
  const key = THEME_STORAGE_KEY;
  const legacy = LEGACY_THEME_STORAGE_KEY;
  return `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${key}");if(!t){var l=localStorage.getItem("${legacy}");if(l==="light"||l==="dark"||l==="system"){t=l;localStorage.setItem("${key}",l);try{localStorage.removeItem("${legacy}")}catch(e){}}}var mq=window.matchMedia("(prefers-color-scheme: dark)");var r=t==="light"||t==="dark"?t:(t==="system"||!t)?(mq.matches?"dark":"light"):"light";d.classList.toggle("dark",r==="dark");d.dataset.style="quiet";}catch(e){}})();`;
}

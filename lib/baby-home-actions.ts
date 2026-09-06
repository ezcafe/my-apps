/** Primary home actions — exported for unit tests (no RTL lib in repo). */
export const BABY_HOME_ACTIONS = [
  { href: "/baby/feed", labelKey: "home.logFeed", en: "Log feed" },
  { href: "/baby/sleep", labelKey: "home.logNap", en: "Log nap" },
  { href: "/baby/diaper", labelKey: "home.logDiaper", en: "Log diaper" },
  {
    href: "/baby/measure",
    labelKey: "home.logMeasure",
    en: "Log measurement",
  },
] as const;

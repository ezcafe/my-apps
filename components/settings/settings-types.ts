import type { ComponentType, SVGProps } from "react";

export type SettingsIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type SettingsCategoryMeta<T extends string = string> = {
  id: T;
  label: string;
  description: string;
  keywords: string[];
  icon?: SettingsIconComponent;
  isDanger?: boolean;
};

// ---------------------------------------------------------------------------
// Global App Settings
// ---------------------------------------------------------------------------

export type SettingsCategoryId =
  | "appearance"
  | "kiosk"
  | "account"
  | "workspaces"
  | "api-tokens"
  | "apple-wallet"
  | "danger-zone";

export const SETTINGS_CATEGORIES: SettingsCategoryMeta<SettingsCategoryId>[] = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and how dates appear across the app.",
    keywords: [
      "theme",
      "color",
      "dark",
      "light",
      "system",
      "mode",
      "style",
      "palette",
      "teal",
      "date",
      "time",
      "format",
      "iso",
      "locale",
      "dmy",
      "mdy",
      "ymd",
      "calendar",
    ],
  },
  {
    id: "kiosk",
    label: "Kiosk",
    description: "Widgets and weather city for your kiosk dashboard.",
    keywords: ["kiosk", "dashboard", "widgets", "home", "weather", "city", "forecast", "temperature", "location"],
  },
  {
    id: "account",
    label: "Account",
    description: "User profile, email, and OIDC identity claims.",
    keywords: ["account", "profile", "user", "email", "name", "oidc", "sub", "subject", "pocket id"],
  },
  {
    id: "workspaces",
    label: "Workspaces",
    description: "Manage default workspaces, roles, and shared workspaces.",
    keywords: ["workspace", "workspaces", "default", "shared", "personal", "owner", "member", "currency", "seed"],
  },
  {
    id: "api-tokens",
    label: "API tokens",
    description: "Personal access tokens for scripts, automation, and API access.",
    keywords: ["api", "token", "tokens", "bearer", "auth", "postman", "keys", "scripts", "automation", "permissions", "scopes"],
  },
  {
    id: "apple-wallet",
    label: "Apple Wallet",
    description: "Baby Care lock-screen updates via Apple Wallet PassKit.",
    keywords: [
      "apple",
      "wallet",
      "passkit",
      "pass",
      "iphone",
      "lock screen",
      "notification",
      "qr",
      "pkpass",
      "baby care",
    ],
  },
  {
    id: "danger-zone",
    label: "Danger zone",
    description: "Permanently delete and reset workspace transactions, loans, and data.",
    keywords: ["reset", "danger", "delete", "wipe", "remove", "clean", "destroy", "purge"],
    isDanger: true,
  },
];

// ---------------------------------------------------------------------------
// Money Settings
// ---------------------------------------------------------------------------

export type MoneySettingsCategoryId =
  | "ledger"
  | "menu"
  | "clone";

export const MONEY_SETTINGS_CATEGORIES: SettingsCategoryMeta<MoneySettingsCategoryId>[] = [
  {
    id: "ledger",
    label: "Accounts & categories",
    description: "Editors for accounts, categories, merchants, tags, budgets, rules, and recurrence.",
    keywords: [
      "account",
      "accounts",
      "category",
      "categories",
      "merchant",
      "merchants",
      "tag",
      "tags",
      "budget",
      "budgets",
      "rule",
      "rules",
      "recurrence",
      "recurrency",
      "ledger",
      "automation",
    ],
  },
  {
    id: "menu",
    label: "Show in menu",
    description: "Choose which Money tabs appear in the navigation menu.",
    keywords: [
      "menu",
      "tabs",
      "navigation",
      "show",
      "hide",
      "visibility",
      "bills",
      "spending",
      "savings",
      "optional",
    ],
  },
  {
    id: "clone",
    label: "Clone structure",
    description: "Copy accounts, categories, merchants, rules, recurrence, and budgets into another workspace.",
    keywords: [
      "clone",
      "copy",
      "workspace",
      "structure",
      "duplicate",
      "transfer",
      "export",
      "seed",
      "target",
    ],
  },
];

// ---------------------------------------------------------------------------
// Investments Settings
// ---------------------------------------------------------------------------

export type InvestmentSettingsCategoryId =
  | "instruments"
  | "ledger";

export const INVESTMENT_SETTINGS_CATEGORIES: SettingsCategoryMeta<InvestmentSettingsCategoryId>[] = [
  {
    id: "instruments",
    label: "Instruments & symbols",
    description: "Manage symbols, contract sizes, profit/loss categories, and Yahoo quote links.",
    keywords: [
      "instrument",
      "instruments",
      "symbol",
      "symbols",
      "quote",
      "quotes",
      "yahoo",
      "ticker",
      "forex",
      "crypto",
      "stock",
      "stocks",
      "commodity",
      "commodities",
      "contract",
      "create",
    ],
  },
  {
    id: "ledger",
    label: "Cash & ledger accounts",
    description: "Default currency and active investment accounts linked to the ledger.",
    keywords: [
      "cash",
      "ledger",
      "account",
      "accounts",
      "currency",
      "usd",
      "vnd",
      "active",
      "balance",
      "realized",
      "pnl",
      "gain",
      "loss",
    ],
  },
];

// ---------------------------------------------------------------------------
// Loans Settings
// ---------------------------------------------------------------------------

export type LoansSettingsCategoryId = "notifications";

export const LOANS_SETTINGS_CATEGORIES: SettingsCategoryMeta<LoansSettingsCategoryId>[] = [
  {
    id: "notifications",
    label: "Payment reminders",
    description: "In-app banners and browser push alerts when loan installments are due.",
    keywords: [
      "notification",
      "notifications",
      "reminder",
      "reminders",
      "push",
      "browser",
      "alert",
      "alerts",
      "due",
      "installment",
      "installments",
      "payment",
      "banner",
      "schedule",
    ],
  },
];

// ---------------------------------------------------------------------------
// Baby Settings
// ---------------------------------------------------------------------------

export type BabySettingsCategoryId = "profile" | "language" | "telegram";

export const BABY_SETTINGS_CATEGORIES: SettingsCategoryMeta<BabySettingsCategoryId>[] = [
  {
    id: "profile",
    label: "Baby profile",
    description: "Birthday used for bottle amounts and next-due times.",
    keywords: [
      "profile",
      "baby",
      "birth",
      "birthday",
      "date",
      "age",
      "bottle",
    ],
  },
  {
    id: "language",
    label: "Language",
    description: "English or Vietnamese for Baby Care screens.",
    keywords: [
      "language",
      "locale",
      "english",
      "vietnamese",
      "en",
      "vi",
      "i18n",
    ],
  },
  {
    id: "telegram",
    label: "Link family chat",
    description: "One family chat per workspace (Telegram model B).",
    keywords: [
      "telegram",
      "chat",
      "bot",
      "link",
      "unlink",
      "family",
      "notify",
    ],
  },
];

// ---------------------------------------------------------------------------
// Generic filter helper
// ---------------------------------------------------------------------------

export function filterSettingsCategories<T extends string>(
  query: string,
  categories: SettingsCategoryMeta<T>[],
): {
  matchingCategories: SettingsCategoryMeta<T>[];
  matchCounts: Partial<Record<T, number>>;
} {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      matchingCategories: categories,
      matchCounts: {},
    };
  }

  const matchCounts: Partial<Record<T, number>> = {};
  const matchingCategories: SettingsCategoryMeta<T>[] = [];

  for (const cat of categories) {
    const matchLabel = cat.label.toLowerCase().includes(normalizedQuery);
    const matchDesc = cat.description.toLowerCase().includes(normalizedQuery);
    const matchKeywords = cat.keywords.some((kw) =>
      kw.toLowerCase().includes(normalizedQuery),
    );

    if (matchLabel || matchDesc || matchKeywords) {
      matchCounts[cat.id] = 1;
      matchingCategories.push(cat);
    } else {
      matchCounts[cat.id] = 0;
    }
  }

  return { matchingCategories, matchCounts };
}

/** Categories to show in the main pane (browse = one; search = matches). */
export function resolveVisibleSettingsCategories<T extends string>(options: {
  isSearching: boolean;
  matchingCategories: SettingsCategoryMeta<T>[];
  activeCategory: T | "all";
  categories: SettingsCategoryMeta<T>[];
  /** Used when browsing with activeCategory `"all"` (should not happen in normal browse). */
  fallbackCategoryId: T;
}): SettingsCategoryMeta<T>[] {
  const {
    isSearching,
    matchingCategories,
    activeCategory,
    categories,
    fallbackCategoryId,
  } = options;

  if (isSearching) {
    return matchingCategories;
  }

  const concreteId =
    activeCategory === "all" ? fallbackCategoryId : activeCategory;
  const found = categories.find((cat) => cat.id === concreteId);
  if (found) return [found];
  return categories[0] ? [categories[0]] : [];
}

/** Resolve a settings category id from `location.hash` (`#id` or `#${idPrefix}-id`). */
export function parseSettingsCategoryFromHash<T extends string>(
  hash: string,
  idPrefix: string,
  categories: SettingsCategoryMeta<T>[],
): T | null {
  const rawHash = hash.replace(/^#/, "");
  if (!rawHash) return null;
  const normalizedHash = rawHash.startsWith(`${idPrefix}-`)
    ? rawHash.slice(idPrefix.length + 1)
    : rawHash;
  // Legacy: Date format merged into Appearance
  if (normalizedHash === "date-format") {
    const appearance = categories.find((cat) => cat.id === ("appearance" as T));
    return appearance ? appearance.id : null;
  }
  // Legacy Baby section ids (pre–SettingsPageLayout)
  if (normalizedHash === "baby-profile" || normalizedHash === "profile") {
    const profile = categories.find((cat) => cat.id === ("profile" as T));
    if (profile) return profile.id;
  }
  if (normalizedHash === "baby-language" || normalizedHash === "language") {
    const language = categories.find((cat) => cat.id === ("language" as T));
    if (language) return language.id;
  }
  if (normalizedHash === "baby-telegram" || normalizedHash === "telegram") {
    const telegram = categories.find((cat) => cat.id === ("telegram" as T));
    if (telegram) return telegram.id;
  }
  const found = categories.find((cat) => cat.id === normalizedHash);
  return found ? found.id : null;
}

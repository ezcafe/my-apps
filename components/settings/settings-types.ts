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
  | "date-format"
  | "home"
  | "account"
  | "workspaces"
  | "api-tokens"
  | "danger-zone";

export const SETTINGS_CATEGORIES: SettingsCategoryMeta<SettingsCategoryId>[] = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Light, dark, or match your OS with teal clean-minimal theme.",
    keywords: ["theme", "color", "dark", "light", "system", "mode", "style", "palette", "teal"],
  },
  {
    id: "date-format",
    label: "Date format",
    description: "Display format for dates across transactions, charts, and reports.",
    keywords: ["date", "time", "format", "iso", "locale", "dmy", "mdy", "ymd", "calendar"],
  },
  {
    id: "home",
    label: "Home",
    description: "Weather city shown on the home dashboard.",
    keywords: ["home", "weather", "city", "forecast", "temperature", "location", "dashboard"],
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

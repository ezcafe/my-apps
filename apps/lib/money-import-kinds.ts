export type MoneyImportKind =
  | "accounts"
  | "categories"
  | "merchants"
  | "tags"
  | "budgets"
  | "transactions"
  | "rules"
  | "recurrence";

export type MoneyImportFkEntity =
  | "account"
  | "merchant"
  | "category_root"
  | "category_leaf";

export type MoneyImportValueKind =
  | "text"
  | "int"
  | "money_minor"
  | "datetime"
  | "bool"
  | "enum";

export type MoneyImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
  valueKind: MoneyImportValueKind;
  enumValues?: readonly string[];
  fk?: MoneyImportFkEntity;
  /** CSV amounts in major units (dollars) */
  allowMajorUnit?: boolean;
};

const MONEY_IMPORT_KIND_LIST = [
  "accounts",
  "categories",
  "merchants",
  "tags",
  "budgets",
  "transactions",
  "rules",
  "recurrence",
] as const;

/** Account types accepted by CSV import and `POST /api/money/accounts`. */
export const MONEY_IMPORT_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "credit",
  "loan",
  "investment",
  "other",
] as const;

const TX_KINDS = ["expense", "income", "transfer"] as const;

const CATEGORY_KINDS = ["expense", "income"] as const;

const CADENCE = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;

export function isMoneyImportKind(value: string): value is MoneyImportKind {
  return (MONEY_IMPORT_KIND_LIST as readonly string[]).includes(value);
}

export function moneyImportFieldDefs(kind: MoneyImportKind): MoneyImportFieldDef[] {
  switch (kind) {
    case "accounts":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "type",
          label: "Type",
          required: false,
          valueKind: "enum",
          enumValues: MONEY_IMPORT_ACCOUNT_TYPES,
        },
        { key: "currency", label: "Currency (ISO)", required: false, valueKind: "text" },
        { key: "institution", label: "Institution", required: false, valueKind: "text" },
        {
          key: "balanceMinor",
          label: "Balance (minor units)",
          required: false,
          valueKind: "money_minor",
          allowMajorUnit: true,
        },
        { key: "sortOrder", label: "Sort order", required: false, valueKind: "int" },
        { key: "archived", label: "Archived", required: false, valueKind: "bool" },
      ];
    case "categories":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "kind",
          label: "Kind (expense / income)",
          required: false,
          valueKind: "enum",
          enumValues: CATEGORY_KINDS,
        },
        {
          key: "parentId",
          label: "Parent category",
          required: false,
          valueKind: "text",
          fk: "category_root",
        },
        { key: "archived", label: "Archived", required: false, valueKind: "bool" },
      ];
    case "merchants":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "normalizedName",
          label: "Normalized name",
          required: false,
          valueKind: "text",
        },
      ];
    case "tags":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "color",
          label: "Color (#RRGGBB)",
          required: false,
          valueKind: "text",
        },
      ];
    case "budgets":
      return [
        {
          key: "scopeType",
          label: "Scope (workspace / category / account / tag)",
          required: true,
          valueKind: "enum",
          enumValues: ["workspace", "category", "account", "tag"],
        },
        {
          key: "scopeId",
          label: "Scope id or name (omit for workspace)",
          required: false,
          valueKind: "text",
        },
        {
          key: "limitAmountMinor",
          label: "Monthly limit (minor units)",
          required: true,
          valueKind: "money_minor",
          allowMajorUnit: true,
        },
        { key: "currency", label: "Currency (ISO)", required: false, valueKind: "text" },
      ];
    case "rules":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "kind",
          label: "Kind (expense / income)",
          required: true,
          valueKind: "enum",
          enumValues: CATEGORY_KINDS,
        },
        { key: "priority", label: "Priority", required: false, valueKind: "int" },
        { key: "active", label: "Active", required: false, valueKind: "bool" },
        {
          key: "matchAccountId",
          label: "Match account",
          required: false,
          valueKind: "text",
          fk: "account",
        },
        {
          key: "matchMerchantId",
          label: "Match merchant",
          required: false,
          valueKind: "text",
          fk: "merchant",
        },
        {
          key: "setCategoryId",
          label: "Set category (leaf)",
          required: false,
          valueKind: "text",
          fk: "category_leaf",
        },
        {
          key: "tagIds",
          label: "Tag IDs (comma UUIDs)",
          required: false,
          valueKind: "text",
        },
      ];
    case "recurrence":
      return [
        { key: "name", label: "Name", required: true, valueKind: "text" },
        {
          key: "templateAccountId",
          label: "Template account",
          required: true,
          valueKind: "text",
          fk: "account",
        },
        {
          key: "templateKind",
          label: "Template kind",
          required: true,
          valueKind: "enum",
          enumValues: TX_KINDS,
        },
        {
          key: "templateAmountMinor",
          label: "Template amount (minor)",
          required: true,
          valueKind: "money_minor",
          allowMajorUnit: true,
        },
        {
          key: "templateCategoryId",
          label: "Template category (leaf)",
          required: false,
          valueKind: "text",
          fk: "category_leaf",
        },
        {
          key: "templateMerchantId",
          label: "Template merchant",
          required: false,
          valueKind: "text",
          fk: "merchant",
        },
        { key: "templateNotes", label: "Template notes", required: false, valueKind: "text" },
        {
          key: "templateTagIds",
          label: "Template tag IDs (comma UUIDs)",
          required: false,
          valueKind: "text",
        },
        {
          key: "templateTagNames",
          label: "Template tag names (comma or |)",
          required: false,
          valueKind: "text",
        },
        {
          key: "cadence",
          label: "Cadence",
          required: true,
          valueKind: "enum",
          enumValues: CADENCE,
        },
        { key: "nextRunAt", label: "Next run at", required: true, valueKind: "datetime" },
        { key: "active", label: "Active", required: false, valueKind: "bool" },
      ];
    case "transactions":
      return [
        {
          key: "accountId",
          label: "Account",
          required: true,
          valueKind: "text",
          fk: "account",
        },
        {
          key: "kind",
          label: "Kind",
          required: false,
          valueKind: "enum",
          enumValues: TX_KINDS,
        },
        {
          key: "amountMinor",
          label: "Amount (minor units)",
          required: true,
          valueKind: "money_minor",
          allowMajorUnit: true,
        },
        { key: "occurredAt", label: "Occurred at", required: false, valueKind: "datetime" },
        {
          key: "categoryId",
          label: "Category (leaf)",
          required: false,
          valueKind: "text",
          fk: "category_leaf",
        },
        {
          key: "merchantId",
          label: "Merchant",
          required: false,
          valueKind: "text",
          fk: "merchant",
        },
        { key: "notes", label: "Notes", required: false, valueKind: "text" },
        {
          key: "tagNames",
          label: "Tag names (comma or |)",
          required: false,
          valueKind: "text",
        },
        {
          key: "tagIds",
          label: "Tag IDs (comma UUIDs)",
          required: false,
          valueKind: "text",
        },
      ];
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export function moneyImportRequiredFkEntities(kind: MoneyImportKind): MoneyImportFkEntity[] {
  const defs = moneyImportFieldDefs(kind);
  const set = new Set<MoneyImportFkEntity>();
  for (const d of defs) {
    if (d.fk) set.add(d.fk);
  }
  return [...set];
}

export const moneyImportSectionTitle: Record<MoneyImportKind, string> = {
  accounts: "Accounts",
  categories: "Categories",
  merchants: "Merchants",
  tags: "Tags",
  budgets: "Budgets",
  transactions: "Transactions",
  rules: "Rules",
  recurrence: "Recurrence",
};

export function moneyImportSettingsPath(kind: MoneyImportKind): string {
  return `/money/settings/${kind}/import`;
}

export function moneyImportApiPath(kind: MoneyImportKind): string {
  return `/api/money/import/${kind}`;
}

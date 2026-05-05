import type { MoneyImportType } from "@/lib/money-import-types";

function headerToCamel(h: string): string {
  const parts = h
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return (
    parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")
  );
}

const ACCOUNT_KEYS = new Set([
  "name",
  "type",
  "currency",
  "institution",
  "balanceMinor",
  "sortOrder",
  "archived",
]);

const CATEGORY_KEYS = new Set([
  "name",
  "parentId",
  "parentSourceId",
  "sourceId",
  "archived",
]);

const BUDGET_KEYS = new Set([
  "categoryId",
  "periodStart",
  "periodEnd",
  "limitAmountMinor",
  "currency",
]);

const TRANSACTION_KEYS = new Set([
  "accountId",
  "kind",
  "amountMinor",
  "occurredAt",
  "categoryId",
  "merchantId",
  "notes",
  "tagIds",
  "tagNames",
  "transferGroupId",
]);

const RULE_KEYS = new Set([
  "name",
  "priority",
  "active",
  "matchAccountId",
  "matchMerchantId",
  "actionSetCategoryId",
  "actionTagIds",
  "matchJson",
  "actionJson",
]);

const RECURRENCE_KEYS = new Set([
  "name",
  "cadence",
  "nextRunAt",
  "active",
  "templateAccountId",
  "templateKind",
  "templateAmountMinor",
  "templateCategoryId",
  "templateMerchantId",
  "templateNotes",
  "templateTagIds",
  "templateJson",
]);

export function allowedKeysForImportType(type: MoneyImportType): Set<string> {
  switch (type) {
    case "accounts":
      return ACCOUNT_KEYS;
    case "categories":
      return CATEGORY_KEYS;
    case "budgets":
      return BUDGET_KEYS;
    case "transactions":
      return TRANSACTION_KEYS;
    case "rules":
      return RULE_KEYS;
    case "recurrence":
      return RECURRENCE_KEYS;
    default: {
      const _e: never = type;
      return _e;
    }
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  type: "Type (account / transaction template)",
  currency: "Currency",
  institution: "Institution",
  balanceMinor: "Balance (minor units)",
  sortOrder: "Sort order",
  archived: "Archived",
  parentId: "Parent category ID",
  parentSourceId: "Parent source ID (batch)",
  sourceId: "Source ID (batch)",
  categoryId: "Category ID",
  periodStart: "Period start",
  periodEnd: "Period end",
  limitAmountMinor: "Limit (minor units)",
  accountId: "Account ID",
  kind: "Kind (expense / income / transfer)",
  amountMinor: "Amount (minor units)",
  occurredAt: "Occurred at",
  merchantId: "Merchant ID",
  notes: "Notes",
  tagIds: "Tag IDs (comma-separated)",
  tagNames: "Tag names (comma-separated)",
  transferGroupId: "Transfer group ID",
  priority: "Priority",
  active: "Active",
  matchAccountId: "Match account ID",
  matchMerchantId: "Match merchant ID",
  actionSetCategoryId: "Action: set category ID",
  actionTagIds: "Action: tag IDs",
  matchJson: "Match JSON",
  actionJson: "Action JSON",
  cadence: "Cadence",
  nextRunAt: "Next run at",
  templateAccountId: "Template account ID",
  templateKind: "Template kind",
  templateAmountMinor: "Template amount (minor)",
  templateCategoryId: "Template category ID",
  templateMerchantId: "Template merchant ID",
  templateNotes: "Template notes",
  templateTagIds: "Template tag IDs",
  templateJson: "Template JSON",
};

/** Dropdown options: value is internal import field key; empty value = ignore (handled in UI). */
export function importColumnSelectOptions(
  type: MoneyImportType,
): { value: string; label: string }[] {
  const keys = [...allowedKeysForImportType(type)];
  keys.sort((a, b) => a.localeCompare(b));
  return keys.map((value) => ({
    value,
    label: FIELD_LABELS[value] ?? value,
  }));
}

function synonymTarget(
  camel: string,
  type: MoneyImportType,
): string | undefined {
  if (type === "accounts") {
    if (["accountName", "title", "label", "nickname"].includes(camel))
      return "name";
    if (["subtype", "accountType", "accountKind", "kind"].includes(camel))
      return "type";
    if (["isoCurrencyCode", "currencyCode", "ccy"].includes(camel))
      return "currency";
    if (["bank", "bankName", "fi", "financialInstitution"].includes(camel))
      return "institution";
    if (camel === "balance" || camel === "currentBalance") return "balanceMinor";
    if (camel === "order" || camel === "position") return "sortOrder";
    if (camel === "isArchived" || camel === "closed") return "archived";
  }
  if (type === "categories") {
    if (["parent", "parentUuid"].includes(camel)) return "parentId";
    if (camel === "parentSource" || camel === "parentSourceUuid")
      return "parentSourceId";
    if (camel === "batchId" || camel === "externalId") return "sourceId";
  }
  if (type === "budgets") {
    if (camel === "limit" || camel === "amountMinor") return "limitAmountMinor";
    if (camel === "start" || camel === "from") return "periodStart";
    if (camel === "end" || camel === "to") return "periodEnd";
  }
  if (type === "transactions") {
    if (camel === "amount" || camel === "value") return "amountMinor";
    if (camel === "date" || camel === "postedAt" || camel === "txnDate")
      return "occurredAt";
    if (camel === "tags") return "tagNames";
  }
  if (type === "rules") {
    if (camel === "matchAccount") return "matchAccountId";
    if (camel === "matchMerchant") return "matchMerchantId";
    if (camel === "setCategoryId" || camel === "categoryId")
      return "actionSetCategoryId";
  }
  if (type === "recurrence") {
    if (camel === "templateAccount") return "templateAccountId";
  }
  return undefined;
}

/** Best-effort default target for a CSV header; "" means ignore. */
export function guessImportColumnTarget(
  header: string,
  type: MoneyImportType,
): string {
  const allowed = allowedKeysForImportType(type);
  const camel = headerToCamel(header);
  if (camel && allowed.has(camel)) return camel;
  const syn = synonymTarget(camel, type);
  if (syn && allowed.has(syn)) return syn;
  return "";
}

export function validateColumnMapTargets(
  map: Record<string, string>,
  type: MoneyImportType,
): string | null {
  const allowed = allowedKeysForImportType(type);
  for (const v of Object.values(map)) {
    const t = String(v).trim();
    if (t === "" || t === "__ignore__") continue;
    if (!allowed.has(t)) {
      return `Invalid column target "${t}"`;
    }
  }
  return null;
}

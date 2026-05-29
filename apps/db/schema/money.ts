import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const moneyAccountTypeEnum = pgEnum("money_account_type", [
  "checking",
  "savings",
  "cash",
  "credit",
  "loan",
  "investment",
  "other",
]);

export const moneyTransactionKindEnum = pgEnum("money_transaction_kind", [
  "expense",
  "income",
  "transfer",
]);

export const moneyCategoryKindEnum = pgEnum("money_category_kind", [
  "expense",
  "income",
]);

export const moneyCadenceEnum = pgEnum("money_cadence", [
  "every_5_minutes",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const moneyBudgetScopeEnum = pgEnum("money_budget_scope", [
  "workspace",
  "category",
  "account",
  "tag",
]);

export const moneyAccount = pgTable(
  "money_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: moneyAccountTypeEnum("type").notNull().default("checking"),
    currency: text("currency").notNull().default("USD"),
    institution: text("institution"),
    /**
     * Cached balance in minor units (e.g. cents), maintained from posted transactions
     * (expense/income/transfer rules in lib/money-account-balance.ts). PATCH on an account
     * can overwrite this for reconciliation; single-leg transfers only debit the given account.
     */
    balanceMinor: bigint("balance_minor", { mode: "number" })
      .notNull()
      .default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("money_account_workspace_idx").on(t.workspaceId)],
);

export const moneyCategory = pgTable(
  "money_category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Immutable after creation. Parent must share the same kind. */
    kind: moneyCategoryKindEnum("kind").notNull(),
    parentId: uuid("parent_id"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_category_workspace_idx").on(t.workspaceId),
    index("money_category_workspace_kind_idx").on(t.workspaceId, t.kind),
    index("money_category_parent_idx").on(t.parentId),
  ],
);

export const moneyTag = pgTable(
  "money_tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_tag_workspace_idx").on(t.workspaceId),
    uniqueIndex("money_tag_workspace_name_uq").on(t.workspaceId, t.name),
  ],
);

export const moneyMerchant = pgTable(
  "money_merchant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("money_merchant_workspace_idx").on(t.workspaceId)],
);

export const moneyRecurrentTemplate = pgTable(
  "money_recurrent_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cadence: moneyCadenceEnum("cadence").notNull().default("monthly"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    template: jsonb("template").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_recurrent_workspace_idx").on(t.workspaceId),
    index("money_recurrent_active_next_run_idx").on(t.active, t.nextRunAt),
  ],
);

export const moneyTransaction = pgTable(
  "money_transaction",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => moneyAccount.id, { onDelete: "restrict" }),
    kind: moneyTransactionKindEnum("kind").notNull().default("expense"),
    /** Absolute amount in minor units (e.g. cents); kind determines sign interpretation in UI */
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    categoryId: uuid("category_id").references(() => moneyCategory.id, {
      onDelete: "set null",
    }),
    merchantId: uuid("merchant_id").references(() => moneyMerchant.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdBySub: text("created_by_sub").notNull(),
    transferPairId: uuid("transfer_pair_id"),
    recurrenceSourceId: uuid("recurrence_source_id").references(
      () => moneyRecurrentTemplate.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_tx_workspace_occurred_idx").on(t.workspaceId, t.occurredAt),
    index("money_tx_workspace_kind_occurred_idx").on(
      t.workspaceId,
      t.kind,
      t.occurredAt,
    ),
    index("money_tx_workspace_category_occurred_idx").on(
      t.workspaceId,
      t.categoryId,
      t.occurredAt,
    ),
    index("money_tx_workspace_merchant_occurred_idx").on(
      t.workspaceId,
      t.merchantId,
      t.occurredAt,
    ),
    index("money_tx_workspace_account_occurred_idx").on(
      t.workspaceId,
      t.accountId,
      t.occurredAt,
    ),
    index("money_tx_workspace_recurrence_occurred_idx").on(
      t.workspaceId,
      t.recurrenceSourceId,
      t.occurredAt,
    ),
    index("money_tx_account_idx").on(t.accountId),
  ],
);

export const moneyTransactionTag = pgTable(
  "money_transaction_tag",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => moneyTransaction.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => moneyTag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("money_transaction_tag_tag_tx_idx").on(t.tagId, t.transactionId),
  ],
);

export const moneyRule = pgTable(
  "money_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Immutable after creation. setCategoryId in `action` must share this kind. */
    kind: moneyCategoryKindEnum("kind").notNull(),
    priority: integer("priority").notNull().default(0),
    match: jsonb("match").notNull(),
    action: jsonb("action").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_rule_workspace_idx").on(t.workspaceId),
    index("money_rule_workspace_kind_idx").on(t.workspaceId, t.kind),
    index("money_rule_priority_idx").on(t.workspaceId, t.priority),
  ],
);

export const moneyBudget = pgTable(
  "money_budget",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    scopeType: moneyBudgetScopeEnum("scope_type").notNull(),
    /** Null only when scopeType is workspace; otherwise category, account, or tag id. */
    scopeId: uuid("scope_id"),
    limitAmountMinor: bigint("limit_amount_minor", {
      mode: "number",
    }).notNull(),
    currency: text("currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("money_budget_workspace_idx").on(t.workspaceId),
    index("money_budget_workspace_scope_idx").on(t.workspaceId, t.scopeType),
    check(
      "money_budget_scope_id_ck",
      sql`(${t.scopeType} = 'workspace' AND ${t.scopeId} IS NULL) OR (${t.scopeType} <> 'workspace' AND ${t.scopeId} IS NOT NULL)`,
    ),
    uniqueIndex("money_budget_workspace_one_uq")
      .on(t.workspaceId)
      .where(sql`${t.scopeType} = 'workspace'`),
    uniqueIndex("money_budget_scope_entity_uq")
      .on(t.workspaceId, t.scopeType, t.scopeId)
      .where(sql`${t.scopeType} <> 'workspace'`),
  ],
);

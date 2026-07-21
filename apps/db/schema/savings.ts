import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const savingsActivityTypeEnum = pgEnum("savings_activity_type", [
  "deposit",
  "withdraw",
  "interest",
]);

export const savingsAccount = pgTable(
  "savings_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: integer("archived").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("savings_account_workspace_idx").on(t.workspaceId)],
);

export const savingsActivity = pgTable(
  "savings_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => savingsAccount.id, { onDelete: "cascade" }),
    activityDate: text("activity_date").notNull(),
    type: savingsActivityTypeEnum("type").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    notes: text("notes"),
    moneyAccountId: uuid("money_account_id"),
    moneyTransactionId: uuid("money_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("savings_activity_workspace_idx").on(t.workspaceId),
    index("savings_activity_account_idx").on(t.accountId),
    index("savings_activity_date_idx").on(t.activityDate),
  ],
);

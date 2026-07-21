import {
  bigint,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const investmentInstrumentKindEnum = pgEnum("investment_instrument_kind", [
  "stocks",
  "coins",
  "fx",
]);

export const investmentActivityTypeEnum = pgEnum("investment_activity_type", [
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
  "deposit",
  "withdraw",
]);

export const investmentInstrument = pgTable(
  "investment_instrument",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: investmentInstrumentKindEnum("kind").notNull(),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    symbol: text("symbol").notNull(),
    yahooSymbol: text("yahoo_symbol"),
    archived: integer("archived").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("investment_instrument_workspace_idx").on(t.workspaceId)],
);

export const investmentActivity = pgTable(
  "investment_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => investmentInstrument.id, { onDelete: "cascade" }),
    activityDate: text("activity_date").notNull(),
    type: investmentActivityTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 24, scale: 8 }),
    unitPriceMinor: bigint("unit_price_minor", { mode: "number" }),
    amountMinor: bigint("amount_minor", { mode: "number" }),
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
    index("investment_activity_workspace_idx").on(t.workspaceId),
    index("investment_activity_instrument_idx").on(t.instrumentId),
    index("investment_activity_date_idx").on(t.activityDate),
  ],
);

export const investmentQuote = pgTable(
  "investment_quote",
  {
    instrumentId: uuid("instrument_id")
      .primaryKey()
      .references(() => investmentInstrument.id, { onDelete: "cascade" }),
    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    source: text("source").notNull().default("yahoo"),
  },
);

export const investmentQuoteDaily = pgTable(
  "investment_quote_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => investmentInstrument.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    closePriceMinor: bigint("close_price_minor", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("investment_quote_daily_instrument_date_uq").on(
      t.instrumentId,
      t.date,
    ),
    index("investment_quote_daily_instrument_idx").on(t.instrumentId),
  ],
);

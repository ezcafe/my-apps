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
  "commodities",
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
    contractSize: numeric("contract_size", { precision: 24, scale: 8 })
      .notNull()
      .default("1"),
    archived: integer("archived").notNull().default(0),
    moneyAccountId: uuid("money_account_id"),
    incomeCategoryId: uuid("income_category_id"),
    expenseCategoryId: uuid("expense_category_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("investment_instrument_workspace_idx").on(t.workspaceId)],
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

export const investmentTradeJournalStatusEnum = pgEnum(
  "investment_trade_journal_status",
  ["open", "closed"],
);

export const investmentTradeJournalTypeEnum = pgEnum(
  "investment_trade_journal_type",
  ["buy", "sell"],
);

export const investmentTradeJournal = pgTable(
  "investment_trade_journal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => investmentInstrument.id, { onDelete: "restrict" }),
    moneyAccountId: uuid("money_account_id").notNull(),
    categoryId: uuid("category_id"),
    activityType: investmentTradeJournalTypeEnum("activity_type").notNull(),
    quantity: numeric("quantity", { precision: 24, scale: 8 }).notNull(),
    openPrice: numeric("open_price", { precision: 24, scale: 8 }).notNull(),
    stopLoss: numeric("stop_loss", { precision: 24, scale: 8 }),
    takeProfit: numeric("take_profit", { precision: 24, scale: 8 }),
    commissionMinor: bigint("commission_minor", { mode: "number" })
      .notNull()
      .default(0),
    activityDate: text("activity_date").notNull(),
    notes: text("notes"),
    status: investmentTradeJournalStatusEnum("status").notNull().default("open"),
    closePrice: numeric("close_price", { precision: 24, scale: 8 }),
    closeFeeMinor: bigint("close_fee_minor", { mode: "number" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    realizedPnlMinor: bigint("realized_pnl_minor", { mode: "number" }),
    closedTransactionId: uuid("closed_transaction_id"),
    createdBySub: text("created_by_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("investment_trade_journal_workspace_status_idx").on(
      t.workspaceId,
      t.status,
    ),
    index("investment_trade_journal_instrument_idx").on(t.instrumentId),
  ],
);

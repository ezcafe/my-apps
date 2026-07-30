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

/**
 * Measure harness for money ledger first-load spans (Task 1).
 * Write owner for fixture = seed helper only; this module times reads.
 */
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import {
  cleanupMoneyLedgerPerfFixture,
  MONEY_LEDGER_PERF_FIXTURE_MIN_TX,
  seedMoneyLedgerPerfFixture,
  type SeedMoneyLedgerPerfFixtureResult,
} from "@/lib/money-ledger-perf-fixture";
import { MONEY_LEDGER_SPENDING } from "@/lib/money-ledger-presets";
import {
  createMoneyLedgerPerfSpans,
  rankMoneyLedgerPerfSpans,
  type MoneyLedgerPerfSpan,
} from "@/lib/money-ledger-perf-spans";
import { moneyTransactionsListQueryInput } from "@/lib/money-query-options";
import { computeMoneyAnalyticsSummary } from "@/lib/money-services/analytics";
import {
  moneyTransactionConditionsForAnalytics,
  resolveAnalyticsFiltersForQuery,
} from "@/lib/money-transaction-analytics-conditions";
import { transactionListQuerySchema } from "@/lib/validators/money";

const PAGE_SIZE = 20;

/** Spans used to gate Tasks 3/6 (excludes fixture seed write). */
export const MONEY_LEDGER_PERF_READ_SPAN_NAMES = [
  "bootstrap",
  "list.count",
  "list.rows",
  "list.tags",
  "summary",
  "dehydrate",
] as const;

export type MoneyLedgerPerfMeasureResult = {
  fixture: SeedMoneyLedgerPerfFixtureResult;
  spans: MoneyLedgerPerfSpan[];
  /** Ranked read-path spans only (no `fixture.seed`). */
  ranked: MoneyLedgerPerfSpan[];
  filterQuery: string;
};

export type MoneyLedgerPerfMeasureOptions = {
  now?: Date;
  txCount?: number;
  topN?: number;
  includeSummary?: boolean;
  /** When true, leave fixture rows after measure (default cleanup). */
  keepFixture?: boolean;
};

export async function measureMoneyLedgerFirstLoad(
  options: MoneyLedgerPerfMeasureOptions = {},
): Promise<MoneyLedgerPerfMeasureResult> {
  const now = options.now ?? new Date();
  const txCount = options.txCount ?? MONEY_LEDGER_PERF_FIXTURE_MIN_TX;
  const topN = options.topN ?? 6;
  const spans = createMoneyLedgerPerfSpans();

  const fixture = await spans.time("fixture.seed", () =>
    seedMoneyLedgerPerfFixture({ now, txCount }),
  );

  await spans.time("bootstrap", async () => {
    const [accounts, categories, tags] = await Promise.all([
      db
        .select({
          id: moneyAccount.id,
          type: moneyAccount.type,
        })
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, fixture.workspaceId)),
      db
        .select({
          id: moneyCategory.id,
          name: moneyCategory.name,
          parentId: moneyCategory.parentId,
        })
        .from(moneyCategory)
        .where(eq(moneyCategory.workspaceId, fixture.workspaceId)),
      db
        .select({ id: moneyTag.id })
        .from(moneyTag)
        .where(eq(moneyTag.workspaceId, fixture.workspaceId)),
    ]);
    return { accounts, categories, tags };
  });

  const filterQuery = moneyLedgerFirstLoadFilterQuery(
    MONEY_LEDGER_SPENDING,
    [{ id: fixture.accountId, type: "checking" }],
    [],
    now,
  );
  const listInput = moneyTransactionsListQueryInput(
    filterQuery,
    1,
    PAGE_SIZE,
    "occurredAt",
    "desc",
  );

  const parsedList = transactionListQuerySchema.parse(listInput);
  const filterSlice = {
    from: parsedList.from,
    to: parsedList.to,
    accountIds: parsedList.accountIds,
    categoryIds: parsedList.categoryIds,
    merchantIds: parsedList.merchantIds,
    tagIds: parsedList.tagIds,
    kinds: parsedList.kinds,
    accountTypes: parsedList.accountTypes,
    excludeAccountTypes: parsedList.excludeAccountTypes,
    recurrence: parsedList.recurrence,
    recurrenceSourceIds: parsedList.recurrenceSourceIds,
  };

  const resolved = await resolveAnalyticsFiltersForQuery(
    fixture.workspaceId,
    filterSlice,
  );
  const conditions = moneyTransactionConditionsForAnalytics(
    fixture.workspaceId,
    resolved,
  );
  const whereClause = and(...conditions);

  await spans.time("list.count", async () => {
    const [{ value }] = await db
      .select({ value: count() })
      .from(moneyTransaction)
      .where(whereClause);
    return value;
  });

  const rows = await spans.time("list.rows", async () => {
    return db
      .select({ id: moneyTransaction.id })
      .from(moneyTransaction)
      .where(whereClause)
      .orderBy(desc(moneyTransaction.occurredAt), desc(moneyTransaction.id))
      .limit(PAGE_SIZE);
  });

  await spans.time("list.tags", async () => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];
    return db
      .select({
        transactionId: moneyTransactionTag.transactionId,
        tagId: moneyTransactionTag.tagId,
      })
      .from(moneyTransactionTag)
      .where(inArray(moneyTransactionTag.transactionId, ids));
  });

  if (options.includeSummary !== false) {
    await spans.time("summary", () =>
      computeMoneyAnalyticsSummary(fixture.workspaceId, filterSlice),
    );
  }

  await spans.time("dehydrate", async () => {
    // Stand-in for SSR dehydrate cost of page-1 list payload shape.
    return {
      workspaceId: fixture.workspaceId,
      page: 1,
      pageSize: PAGE_SIZE,
      rowCount: rows.length,
    };
  });

  const snapshot = spans.snapshot();
  const readSpans = snapshot.filter((s) =>
    (MONEY_LEDGER_PERF_READ_SPAN_NAMES as readonly string[]).includes(s.name),
  );
  const ranked = rankMoneyLedgerPerfSpans(readSpans, topN);

  if (!options.keepFixture) {
    await cleanupMoneyLedgerPerfFixture();
  }

  return {
    fixture,
    spans: snapshot,
    ranked,
    filterQuery,
  };
}

export function formatMoneyLedgerPerfRankTable(
  ranked: ReadonlyArray<MoneyLedgerPerfSpan>,
): string {
  const lines = [
    "| Rank | Span | ms |",
    "|------|------|---:|",
    ...ranked.map((s, i) => `| ${i + 1} | \`${s.name}\` | ${s.ms.toFixed(1)} |`),
  ];
  return lines.join("\n");
}

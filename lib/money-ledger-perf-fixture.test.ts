import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { and, count, eq, gte, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import {
  cleanupMoneyLedgerPerfFixture,
  MONEY_LEDGER_PERF_FIXTURE_MIN_TX,
  MONEY_LEDGER_PERF_OWNER_SUB,
  moneyLedgerPerfMeasureWindow,
  seedMoneyLedgerPerfFixture,
} from "@/lib/money-ledger-perf-fixture";
import { MONEY_LEDGER_SPENDING } from "@/lib/money-ledger-presets";
import { moneyTransactionsListQueryInput } from "@/lib/money-query-options";

describe("moneyLedgerPerfMeasureWindow", () => {
  it("matches Spending first-load current-month bounds", () => {
    const now = new Date("2026-10-15T12:00:00");
    const window = moneyLedgerPerfMeasureWindow(now);
    const filterQuery = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_SPENDING,
      [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "checking" }],
      [],
      now,
    );
    const input = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
    );
    assert.equal(window.from, input.from);
    assert.equal(window.to, input.to);
  });
});

describe("seedMoneyLedgerPerfFixture", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it("default target is at least 10k transactions", () => {
    assert.ok(MONEY_LEDGER_PERF_FIXTURE_MIN_TX >= 10_000);
  });

  it(
    "is idempotent, cleans up, and seeds rows visible under first-load predicates",
    { skip: !hasDb },
    async () => {
      const now = new Date("2026-10-15T12:00:00");
      // Small count for unit speed; full ≥10k via measure script.
      const txCount = 50;

      const first = await seedMoneyLedgerPerfFixture({
        now,
        txCount,
      });
      assert.equal(first.ownerSub, MONEY_LEDGER_PERF_OWNER_SUB);
      assert.equal(first.txCount, txCount);

      const second = await seedMoneyLedgerPerfFixture({
        now,
        txCount,
      });
      assert.equal(second.workspaceId, first.workspaceId);
      assert.equal(second.txCount, txCount);

      const workspaces = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.ownedByUserSub, MONEY_LEDGER_PERF_OWNER_SUB));
      assert.equal(workspaces.length, 1);

      const filterQuery = moneyLedgerFirstLoadFilterQuery(
        MONEY_LEDGER_SPENDING,
        [{ id: second.accountId, type: "checking" }],
        [],
        now,
      );
      const input = moneyTransactionsListQueryInput(
        filterQuery,
        1,
        20,
        "occurredAt",
        "desc",
      );
      assert.equal(typeof input.from, "string");
      assert.equal(typeof input.to, "string");

      const [{ value: visible }] = await db
        .select({ value: count() })
        .from(moneyTransaction)
        .innerJoin(
          moneyAccount,
          eq(moneyAccount.id, moneyTransaction.accountId),
        )
        .where(
          and(
            eq(moneyTransaction.workspaceId, second.workspaceId),
            gte(moneyTransaction.occurredAt, new Date(String(input.from))),
            lte(moneyTransaction.occurredAt, new Date(String(input.to))),
            notInArray(moneyAccount.type, [
              "savings",
              "investment",
              "loan",
            ]),
          ),
        );
      assert.equal(visible, txCount);

      await cleanupMoneyLedgerPerfFixture();
      const after = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.ownedByUserSub, MONEY_LEDGER_PERF_OWNER_SUB));
      assert.equal(after.length, 0);

      const orphanTx = await db.execute(sql`
        select 1 from money_transaction
        where workspace_id = ${second.workspaceId}::uuid
        limit 1
      `);
      assert.equal(orphanTx.length, 0);
    },
  );
});

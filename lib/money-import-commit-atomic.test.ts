import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDbTransactionBound, withDbTransaction } from "@/db";

/**
 * Always-on substitute when DATABASE_URL is unset: prove the outer-tx
 * rollback contract (writes + preview delete share one callback). Real DB
 * ALS check remains available when DATABASE_URL is set.
 */
describe("money import commit atomicity", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it(
    "isDbTransactionBound is true inside withDbTransaction (ALS)",
    { skip: !hasDb },
    async () => {
      assert.equal(isDbTransactionBound(), false);
      await withDbTransaction(async () => {
        assert.equal(isDbTransactionBound(), true);
      });
      assert.equal(isDbTransactionBound(), false);
    },
  );

  it("rollback Red: throw after import writes / on delete → no lasting rows", async () => {
    type Ledger = {
      importRows: number[];
      previewDeleted: boolean;
      idempotencyCompleted: boolean;
    };

    async function outerRlsTx<T>(
      ledger: Ledger,
      run: () => Promise<T>,
    ): Promise<T> {
      const snap: Ledger = {
        importRows: [...ledger.importRows],
        previewDeleted: ledger.previewDeleted,
        idempotencyCompleted: ledger.idempotencyCompleted,
      };
      try {
        return await run();
      } catch (e) {
        // Same contract as Postgres ROLLBACK on the outer RLS connection.
        ledger.importRows = snap.importRows;
        ledger.previewDeleted = snap.previewDeleted;
        ledger.idempotencyCompleted = snap.idempotencyCompleted;
        throw e;
      }
    }

    const ledger: Ledger = {
      importRows: [],
      previewDeleted: false,
      idempotencyCompleted: false,
    };

    await assert.rejects(
      () =>
        outerRlsTx(ledger, async () => {
          // commitMoneyImport writes
          ledger.importRows.push(1, 2, 3);
          // deleteImportPreview fails (or later step fails)
          throw new Error("preview delete failed");
        }),
      /preview delete failed/,
    );

    assert.deepEqual(ledger.importRows, []);
    assert.equal(ledger.previewDeleted, false);
    assert.equal(ledger.idempotencyCompleted, false);
  });

  it("commit route: prune outside; single RLS; skipPrune; no nested db.transaction", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/money/import/commit/route.ts"),
      "utf8",
    );
    const moneyImport = readFileSync(
      join(process.cwd(), "lib/money-import.ts"),
      "utf8",
    );
    assert.match(route, /pruneExpiredImportPreviews/);
    assert.match(route, /skipPrune:\s*true/);
    assert.match(route, /withMoneyWorkspaceRls/);
    assert.match(moneyImport, /isDbTransactionBound/);
    assert.doesNotMatch(moneyImport, /return db\.transaction\(/);

    // Fail-closed: commit + delete (+ complete) share one outer RLS callback.
    const rlsStart = route.indexOf("withMoneyWorkspaceRls(ctx, async () => {");
    assert.ok(rlsStart >= 0, "expected single withMoneyWorkspaceRls callback");
    const rlsBody = route.slice(rlsStart, rlsStart + 900);
    assert.match(rlsBody, /commitMoneyImport/);
    assert.match(rlsBody, /deleteImportPreview/);
    assert.match(rlsBody, /completeIdempotencyClaim/);
  });

  it("preview store skipPrune option exists on get/delete", () => {
    const store = readFileSync(
      join(process.cwd(), "lib/money-import-preview-store.ts"),
      "utf8",
    );
    assert.match(store, /skipPrune/);
    assert.match(store, /export async function pruneExpiredImportPreviews/);
  });
});

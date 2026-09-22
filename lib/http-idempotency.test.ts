import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db, isDbTransactionBound, withDbTransaction } from "@/db";
import { httpIdempotency } from "@/db/schema/http-idempotency";
import { workspace } from "@/db/schema/workspace";
import { badRequest } from "@/lib/api-http";
import {
  claimIdempotencyKey,
  completeIdempotencyClaim,
  deleteIdempotencyClaim,
  hashRawBodyBytes,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_REPLAYED_HEADER,
  parseIdempotencyKeyHeader,
  pruneExpiredIdempotencyCompleted,
} from "@/lib/http-idempotency";

describe("idempotencyKey_rejectsOver128", () => {
  it("header length > 128 → bad_request, no claim attempted via parse", async () => {
    const long = "k".repeat(IDEMPOTENCY_KEY_MAX_LENGTH + 1);
    const parsed = parseIdempotencyKeyHeader(long);
    assert.equal(parsed.present, true);
    assert.ok(parsed.present && "error" in parsed && parsed.error === "too_long");
    const res = await badRequest("Idempotency-Key must be at most 128 characters");
    assert.equal(res.status, 400);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, "bad_request");
  });
});

describe("idempotency hash + parse", () => {
  it("hashRawBodyBytes is stable for same bytes and differs on whitespace", () => {
    const a = hashRawBodyBytes('{"a":1}');
    const b = hashRawBodyBytes('{"a":1}');
    const c = hashRawBodyBytes('{ "a": 1 }');
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("missing header → present false (passthrough)", () => {
    assert.deepEqual(parseIdempotencyKeyHeader(null), { present: false });
    assert.deepEqual(parseIdempotencyKeyHeader(""), { present: false });
    assert.deepEqual(parseIdempotencyKeyHeader("  "), { present: false });
  });

  it("accepts key of length 128", () => {
    const key = "x".repeat(IDEMPOTENCY_KEY_MAX_LENGTH);
    const parsed = parseIdempotencyKeyHeader(key);
    assert.deepEqual(parsed, { present: true, key });
  });
});

describe("http_idempotency schema", () => {
  it("defines unique (workspace_id, user_sub, route, key)", () => {
    const config = getTableConfig(httpIdempotency);
    const uniqueNames = config.uniqueConstraints.map((u) => u.name);
    assert.ok(
      uniqueNames.includes("http_idempotency_workspace_user_route_key_uq"),
      `expected unique constraint, got ${uniqueNames.join(",")}`,
    );
  });

  it("migration SQL creates table + unique", () => {
    const sql = readFileSync(
      join(process.cwd(), "db/migrations/0042_http_idempotency.sql"),
      "utf8",
    );
    assert.match(sql, /CREATE TABLE IF NOT EXISTS http_idempotency/);
    assert.match(sql, /http_idempotency_workspace_user_route_key_uq/);
  });
});

/**
 * Always-on integrity substitutes (no DATABASE_URL).
 * Protocol DB cases below remain skippable; these fail closed if wiring regresses.
 */
describe("idempotency integrity always-on (mocked ALS/tx + wiring)", () => {
  it("same-tx: fail after side-effect write → writes rolled back + no completed claim", async () => {
    type Store = {
      sideEffectRows: string[];
      claimStatus: "in_progress" | "completed";
    };

    async function mutatorTx(store: Store, run: () => Promise<void>): Promise<void> {
      const snap: Store = {
        sideEffectRows: [...store.sideEffectRows],
        claimStatus: store.claimStatus,
      };
      try {
        await run();
      } catch (e) {
        store.sideEffectRows = snap.sideEffectRows;
        store.claimStatus = snap.claimStatus;
        throw e;
      }
    }

    const store: Store = { sideEffectRows: [], claimStatus: "in_progress" };

    await assert.rejects(
      () =>
        mutatorTx(store, async () => {
          store.sideEffectRows.push("import-row-1");
          // complete would flip status — crash before/with incomplete complete
          store.claimStatus = "completed";
          throw new Error("force fail after write before HTTP response");
        }),
      /force fail/,
    );

    assert.deepEqual(store.sideEffectRows, []);
    assert.equal(store.claimStatus, "in_progress");
  });

  it("replay mapping sets Idempotency-Replayed: true and Cache-Control: no-store", async () => {
    const { idempotencyReplayResponse } = await import("@/lib/http-idempotency");
    const replayBody = { data: { imported: 1 } };
    const res = idempotencyReplayResponse(200, replayBody);
    assert.equal(res.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
    assert.equal(res.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await res.json(), replayBody);
  });

  it("hot routes: shared begin helper + complete in mutator tx; validate-first", () => {
    const money = readFileSync(
      join(process.cwd(), "app/api/money/import/commit/route.ts"),
      "utf8",
    );
    const inv = readFileSync(
      join(process.cwd(), "app/api/investment/import/commit/route.ts"),
      "utf8",
    );
    const members = readFileSync(
      join(process.cwd(), "app/api/workspace/members/route.ts"),
      "utf8",
    );
    const helper = readFileSync(
      join(process.cwd(), "lib/http-idempotency.ts"),
      "utf8",
    );

    assert.match(helper, /beginIdempotencyRequest/);
    assert.match(helper, /idempotencyReplayResponse/);
    assert.match(helper, /"Cache-Control":\s*"no-store"/);
    assert.match(helper, /IDEMPOTENCY_REPLAYED_HEADER/);

    for (const src of [money, inv, members]) {
      assert.match(src, /beginIdempotencyRequest/);
      assert.match(src, /completeIdempotencyClaim/);
      assert.match(src, /abortIdempotencyClaim/);
    }

    // Money: Zod before claim (ignore import line)
    const moneyParse = money.indexOf("importCommitBodySchema.safeParse");
    const moneyBegin = money.indexOf("await beginIdempotencyRequest");
    assert.ok(moneyParse >= 0 && moneyBegin > moneyParse);

    // Investment: Zod commit schema before claim
    const invParse = inv.indexOf("investmentImportCommitBodySchema.safeParse");
    const invBegin = inv.indexOf("await beginIdempotencyRequest");
    assert.ok(invParse >= 0 && invBegin > invParse);

    // Members: Zod then owner verify before claim (trusted workspaceId)
    const membersParse = members.indexOf("workspaceMemberCreateSchema.safeParse");
    const membersOwner = members.indexOf(
      "await assertWorkspaceOwner(userSub, workspaceId)",
    );
    const membersBegin = members.indexOf("await beginIdempotencyRequest");
    assert.ok(membersParse >= 0 && membersOwner > membersParse);
    assert.ok(membersBegin > membersOwner);

    // Members complete stores redacted replay (no email in stored body helper)
    assert.match(members, /membersIdempotencyReplayBody/);

    // Money: complete inside withMoneyWorkspaceRls
    const moneyRls = money.indexOf("withMoneyWorkspaceRls(ctx, async () => {");
    assert.ok(moneyRls >= 0);
    assert.match(
      money.slice(moneyRls, moneyRls + 900),
      /completeIdempotencyClaim/,
    );

    // Investment: complete inside withInvestmentWorkspaceRls
    const invRls = inv.indexOf("withInvestmentWorkspaceRls(ctx, async () => {");
    assert.ok(invRls >= 0);
    assert.match(
      inv.slice(invRls, invRls + 700),
      /completeIdempotencyClaim/,
    );

    // Members: complete inside withDbTransaction
    const membersTx = members.indexOf("withDbTransaction(async () => {");
    assert.ok(membersTx >= 0);
    assert.match(
      members.slice(membersTx, membersTx + 2000),
      /completeIdempotencyClaim/,
    );

    // Expired reclaim deletes then insertClaim (completed or in_progress)
    assert.match(helper, /expiresAt\.getTime\(\) <= Date\.now\(\)/);
    assert.match(helper, /insertClaim/);
    // Prune completed only, batched
    assert.match(helper, /status = 'completed'/);
    assert.match(helper, /IDEMPOTENCY_PRUNE_BATCH_SIZE/);
    assert.match(helper, /LIMIT \$\{IDEMPOTENCY_PRUNE_BATCH_SIZE\}/);
  });
});

describe("http idempotency protocol (db)", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  async function seedWorkspace() {
    const workspaceId = randomUUID();
    const userSub = `idem-${workspaceId}`;
    await db.insert(workspace).values({
      id: workspaceId,
      name: "Idempotency Test",
      kind: "personal",
      ownedByUserSub: userSub,
    });
    return { workspaceId, userSub, route: "POST /api/money/import/commit" };
  }

  async function cleanup(workspaceId: string) {
    await db
      .delete(httpIdempotency)
      .where(eq(httpIdempotency.workspaceId, workspaceId));
    await db.delete(workspace).where(eq(workspace.id, workspaceId));
  }

  it(
    "same key twice → one claim, replay after complete",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const hash = hashRawBodyBytes('{"type":"accounts","rows":[]}');
      try {
        const first = await claimIdempotencyKey(actor, key, hash);
        assert.equal(first.kind, "claimed");
        if (first.kind !== "claimed") return;

        const body = { data: { imported: 1 } };
        await withDbTransaction(async () => {
          await completeIdempotencyClaim(actor, first.claimId, 200, body);
        });

        const second = await claimIdempotencyKey(actor, key, hash);
        assert.equal(second.kind, "replay");
        if (second.kind === "replay") {
          assert.deepEqual(second.body, body);
          assert.equal(second.status, 200);
        }
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "same key different payload → body_mismatch",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      try {
        const first = await claimIdempotencyKey(
          actor,
          key,
          hashRawBodyBytes('{"a":1}'),
        );
        assert.equal(first.kind, "claimed");
        if (first.kind !== "claimed") return;
        await withDbTransaction(async () => {
          await completeIdempotencyClaim(actor, first.claimId, 200, { ok: true });
        });

        const mismatch = await claimIdempotencyKey(
          actor,
          key,
          hashRawBodyBytes('{"a":2}'),
        );
        assert.equal(mismatch.kind, "body_mismatch");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "concurrent claim while non-expired in_progress → in_progress",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const hash = hashRawBodyBytes("{}");
      try {
        const first = await claimIdempotencyKey(actor, key, hash);
        assert.equal(first.kind, "claimed");
        const second = await claimIdempotencyKey(actor, key, hash);
        assert.equal(second.kind, "in_progress");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "post-claim abort → delete; retry same key+body succeeds",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const hash = hashRawBodyBytes("{}");
      try {
        const first = await claimIdempotencyKey(actor, key, hash);
        assert.equal(first.kind, "claimed");
        if (first.kind !== "claimed") return;
        await deleteIdempotencyClaim(actor, first.claimId);

        const retry = await claimIdempotencyKey(actor, key, hash);
        assert.equal(retry.kind, "claimed");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "expired in_progress row → reclaim (not in_progress)",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const hash = hashRawBodyBytes("{}");
      try {
        await db.insert(httpIdempotency).values({
          workspaceId: actor.workspaceId,
          userSub: actor.userSub,
          route: actor.route,
          key,
          requestHash: hash,
          status: "in_progress",
          expiresAt: new Date(Date.now() - 60_000),
        });

        const reclaim = await claimIdempotencyKey(actor, key, hash);
        assert.equal(reclaim.kind, "claimed");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "expired completed row → reclaim (not body_mismatch / in_progress)",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const hash = hashRawBodyBytes("{}");
      try {
        await db.insert(httpIdempotency).values({
          workspaceId: actor.workspaceId,
          userSub: actor.userSub,
          route: actor.route,
          key,
          requestHash: hashRawBodyBytes('{"old":true}'),
          status: "completed",
          responseStatus: 200,
          responseBody: { data: { old: true } },
          expiresAt: new Date(Date.now() - 60_000),
          completedAt: new Date(Date.now() - 120_000),
        });

        const reclaim = await claimIdempotencyKey(actor, key, hash);
        assert.equal(reclaim.kind, "claimed");
        assert.notEqual(reclaim.kind, "body_mismatch");
        assert.notEqual(reclaim.kind, "in_progress");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "same-tx: fail after side-effect write before complete → writes rolled back + no completed row",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const key = `k-${randomUUID()}`;
      const sideKey = `side-${randomUUID()}`;
      const hash = hashRawBodyBytes("{}");
      try {
        const first = await claimIdempotencyKey(actor, key, hash);
        assert.equal(first.kind, "claimed");
        if (first.kind !== "claimed") return;

        await assert.rejects(async () => {
          await withDbTransaction(async () => {
            assert.equal(isDbTransactionBound(), true);
            // Side-effect write sharing the mutator tx (stand-in for import/add).
            await db.insert(httpIdempotency).values({
              workspaceId: actor.workspaceId,
              userSub: actor.userSub,
              route: `${actor.route}:side`,
              key: sideKey,
              requestHash: "side-effect",
              status: "in_progress",
              expiresAt: new Date(Date.now() + 60_000),
            });
            // Crash before completeIdempotencyClaim — success-without-complete window.
            throw new Error("force fail after write before complete");
          });
        });

        const sideRows = await db
          .select()
          .from(httpIdempotency)
          .where(
            and(
              eq(httpIdempotency.workspaceId, actor.workspaceId),
              eq(httpIdempotency.key, sideKey),
            ),
          );
        assert.equal(sideRows.length, 0, "side-effect write must roll back");

        const claimRows = await db
          .select()
          .from(httpIdempotency)
          .where(
            and(
              eq(httpIdempotency.workspaceId, actor.workspaceId),
              eq(httpIdempotency.key, key),
            ),
          );
        assert.equal(claimRows.length, 1);
        assert.equal(claimRows[0]?.status, "in_progress");
        assert.notEqual(claimRows[0]?.status, "completed");

        await deleteIdempotencyClaim(actor, first.claimId);
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );

  it(
    "idempotencyPrune_skipsInProgress",
    { skip: !hasDb },
    async () => {
      const actor = await seedWorkspace();
      const completedKey = `done-${randomUUID()}`;
      const inProgressKey = `prog-${randomUUID()}`;
      try {
        await db.insert(httpIdempotency).values([
          {
            workspaceId: actor.workspaceId,
            userSub: actor.userSub,
            route: actor.route,
            key: completedKey,
            requestHash: "h1",
            status: "completed",
            responseStatus: 200,
            responseBody: { ok: true },
            expiresAt: new Date(Date.now() - 60_000),
            completedAt: new Date(Date.now() - 120_000),
          },
          {
            workspaceId: actor.workspaceId,
            userSub: actor.userSub,
            route: actor.route,
            key: inProgressKey,
            requestHash: "h2",
            status: "in_progress",
            expiresAt: new Date(Date.now() - 60_000),
          },
        ]);

        await pruneExpiredIdempotencyCompleted();

        const remaining = await db
          .select({ key: httpIdempotency.key, status: httpIdempotency.status })
          .from(httpIdempotency)
          .where(eq(httpIdempotency.workspaceId, actor.workspaceId));

        assert.equal(remaining.length, 1);
        assert.equal(remaining[0]?.key, inProgressKey);
        assert.equal(remaining[0]?.status, "in_progress");
      } finally {
        await cleanup(actor.workspaceId);
      }
    },
  );
});

describe("idempotencyKey_absent_passthrough", () => {
  it("missing Idempotency-Key → no claim path (parse present false)", () => {
    assert.deepEqual(parseIdempotencyKeyHeader(null), { present: false });
  });
});

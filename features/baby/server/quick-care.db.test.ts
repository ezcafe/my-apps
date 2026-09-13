import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  babyCareEvent,
  babyQuickCareRequest,
} from "@/db/schema/baby";
import { workspace } from "@/db/schema/workspace";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import { runBabyQuickCare } from "@/features/baby/server/quick-care";

/**
 * Live-database replay and concurrency for babyQuickCare.
 * Skip when DATABASE_URL is unset.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

async function seedWorkspace(): Promise<{
  workspaceId: string;
  userSub: string;
}> {
  const workspaceId = randomUUID();
  const userSub = `test-quick-care-${workspaceId}`;
  await db.insert(workspace).values({
    id: workspaceId,
    name: "Baby quick care",
    kind: "personal",
    ownedByUserSub: userSub,
    defaultCurrency: "USD",
  });
  await ensureBabyProfile(workspaceId, "Quick Baby");
  return { workspaceId, userSub };
}

async function wipeWorkspace(workspaceId: string): Promise<void> {
  await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function careCount(workspaceId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(babyCareEvent)
    .where(eq(babyCareEvent.workspaceId, workspaceId));
  return Number(rows[0]?.n ?? 0);
}

async function requestCount(workspaceId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(babyQuickCareRequest)
    .where(eq(babyQuickCareRequest.workspaceId, workspaceId));
  return Number(rows[0]?.n ?? 0);
}

describe("babyQuickCare live database", () => {
  it(
    "replays same clientRequestId with identical steps and unchanged care count",
    { skip: !hasDb },
    async () => {
      const { workspaceId, userSub } = await seedWorkspace();
      try {
        const clientRequestId = `replay-${randomUUID().slice(0, 8)}`;
        const input = {
          action: { kind: "FORMULA" as const, amountMl: 120 },
          breastRunning: null,
          clientRequestId,
        };
        const first = await runBabyQuickCare(workspaceId, userSub, input);
        assert.equal(first.replayed, false);
        assert.deepEqual(
          first.steps.map((s) => s.step),
          ["createFormula"],
        );
        const countAfterFirst = await careCount(workspaceId);

        const second = await runBabyQuickCare(workspaceId, userSub, input);
        assert.equal(second.replayed, true);
        assert.deepEqual(
          second.steps.map((s) => s.step),
          first.steps.map((s) => s.step),
        );
        assert.equal(await careCount(workspaceId), countAfterFirst);
        assert.equal(await requestCount(workspaceId), 1);
      } finally {
        await wipeWorkspace(workspaceId);
      }
    },
  );

  it(
    "replays after backdating created_at by 30 days (no expiry)",
    { skip: !hasDb },
    async () => {
      const { workspaceId, userSub } = await seedWorkspace();
      try {
        const clientRequestId = `old-${randomUUID().slice(0, 8)}`;
        const input = {
          action: { kind: "DIAPER" as const, diaperKind: "wet" as const },
          breastRunning: null,
          clientRequestId,
        };
        const first = await runBabyQuickCare(workspaceId, userSub, input);
        assert.equal(first.replayed, false);

        await db
          .update(babyQuickCareRequest)
          .set({
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .where(
            and(
              eq(babyQuickCareRequest.workspaceId, workspaceId),
              eq(babyQuickCareRequest.requestId, clientRequestId),
            ),
          );

        const count = await careCount(workspaceId);
        const second = await runBabyQuickCare(workspaceId, userSub, input);
        assert.equal(second.replayed, true);
        assert.equal(await careCount(workspaceId), count);
      } finally {
        await wipeWorkspace(workspaceId);
      }
    },
  );

  it(
    "concurrent same clientRequestId → one care set and one request row",
    { skip: !hasDb },
    async () => {
      const { workspaceId, userSub } = await seedWorkspace();
      try {
        const clientRequestId = `conc-${randomUUID().slice(0, 8)}`;
        const input = {
          action: { kind: "SLEEP" as const },
          breastRunning: null,
          clientRequestId,
        };
        const [a, b] = await Promise.all([
          runBabyQuickCare(workspaceId, userSub, input),
          runBabyQuickCare(workspaceId, userSub, input),
        ]);
        assert.equal(await requestCount(workspaceId), 1);
        assert.equal(await careCount(workspaceId), 1);
        const replayedCount = [a, b].filter((r) => r.replayed).length;
        assert.ok(replayedCount >= 1);
        assert.deepEqual(
          a.steps.map((s) => s.step),
          b.steps.map((s) => s.step),
        );
      } finally {
        await wipeWorkspace(workspaceId);
      }
    },
  );
});

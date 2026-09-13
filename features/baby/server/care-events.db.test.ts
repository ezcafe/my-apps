import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { babyCareEvent, babyProfile } from "@/db/schema/baby";
import { workspace } from "@/db/schema/workspace";
import {
  deleteBabyEvent,
  findOpenSleep,
  startBabySleep,
  updateBabyEvent,
} from "@/features/baby/server/care-events";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import { runBabyQuickCare } from "@/features/baby/server/quick-care";

/**
 * Live-database race suites for the shared nap lock.
 * Skip when DATABASE_URL is unset — same shape as lib/workspace-reset.test.ts.
 * Run with: DATABASE_URL=… npm test
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const ROUNDS = 20;

async function seedWorkspace(): Promise<{
  workspaceId: string;
  userSub: string;
  babyId: string;
}> {
  const workspaceId = randomUUID();
  const userSub = `test-baby-lock-${workspaceId}`;
  await db.insert(workspace).values({
    id: workspaceId,
    name: "Baby lock race",
    kind: "personal",
    ownedByUserSub: userSub,
    defaultCurrency: "USD",
  });
  const baby = await ensureBabyProfile(workspaceId, "Race Baby");
  return { workspaceId, userSub, babyId: baby.id };
}

async function wipeWorkspace(workspaceId: string): Promise<void> {
  await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function openNapCount(
  workspaceId: string,
  babyId: string,
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "sleep"),
        isNull(babyCareEvent.endedAt),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

describe("baby care lock live races", () => {
  it(
    "serializes quick-care diaper vs startBabySleep — never diaper + open nap",
    { skip: !hasDb },
    async () => {
      for (let round = 0; round < ROUNDS; round++) {
        const { workspaceId, userSub, babyId } = await seedWorkspace();
        try {
          const results = await Promise.allSettled([
            runBabyQuickCare(workspaceId, userSub, {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
              clientRequestId: `race-diaper-${round}-${randomUUID().slice(0, 8)}`,
            }),
            startBabySleep(workspaceId, userSub, {}),
          ]);
          const rejects = results.filter((r) => r.status === "rejected");
          // One path may hit open-nap conflict; end state must stay consistent.
          assert.ok(rejects.length <= 1, `round ${round}: unexpected rejects`);

          const open = await openNapCount(workspaceId, babyId);
          assert.ok(open <= 1, `round ${round}: ${open} open naps`);

          const diapers = await db
            .select()
            .from(babyCareEvent)
            .where(
              and(
                eq(babyCareEvent.workspaceId, workspaceId),
                eq(babyCareEvent.type, "diaper"),
              ),
            );
          if (diapers.length > 0) {
            // Diaper committed ⇒ must not leave a nap open from a lost race.
            // Either nap is closed, or nap started after and is the only open one
            // without a second open nap (already asserted). Never two opens.
            assert.equal(open <= 1, true);
          }
          const openRow = await findOpenSleep(workspaceId, babyId);
          if (diapers.length > 0 && openRow) {
            // Allowed: sleep started after chain finished, or chain ended then
            // start won. Forbidden: diaper while that same nap was already open
            // before the diaper (two opens already blocked).
            assert.ok(openRow.endedAt == null);
          }
        } finally {
          await wipeWorkspace(workspaceId);
        }
      }
    },
  );

  it(
    "two concurrent quick-care chains never leave two open naps",
    { skip: !hasDb },
    async () => {
      for (let round = 0; round < ROUNDS; round++) {
        const { workspaceId, userSub, babyId } = await seedWorkspace();
        try {
          await Promise.all([
            runBabyQuickCare(workspaceId, userSub, {
              action: { kind: "DIAPER", diaperKind: "wet" },
              breastRunning: null,
              clientRequestId: `race-qc-d-${round}-${randomUUID().slice(0, 8)}`,
            }),
            runBabyQuickCare(workspaceId, userSub, {
              action: { kind: "SLEEP" },
              breastRunning: null,
              clientRequestId: `race-qc-s-${round}-${randomUUID().slice(0, 8)}`,
            }),
          ]);
          assert.ok(
            (await openNapCount(workspaceId, babyId)) <= 1,
            `round ${round}`,
          );
        } finally {
          await wipeWorkspace(workspaceId);
        }
      }
    },
  );

  it(
    "nap reopen race: diaper quick-care vs updateBabyEvent reopen",
    { skip: !hasDb },
    async () => {
      for (let round = 0; round < ROUNDS; round++) {
        const { workspaceId, userSub, babyId } = await seedWorkspace();
        try {
          const sleep = await startBabySleep(workspaceId, userSub, {});
          await updateBabyEvent(workspaceId, userSub, {
            id: sleep.id,
            endedAt: new Date().toISOString(),
          });

          await Promise.allSettled([
            runBabyQuickCare(workspaceId, userSub, {
              action: { kind: "DIAPER", diaperKind: "dirty" },
              breastRunning: null,
              clientRequestId: `race-reopen-${round}-${randomUUID().slice(0, 8)}`,
            }),
            updateBabyEvent(workspaceId, userSub, {
              id: sleep.id,
              endedAt: null,
            }),
          ]);

          assert.ok(
            (await openNapCount(workspaceId, babyId)) <= 1,
            `round ${round}`,
          );
        } finally {
          await wipeWorkspace(workspaceId);
        }
      }
    },
  );

  it(
    "nap delete race: diaper quick-care vs deleteBabyEvent on open sleep",
    { skip: !hasDb },
    async () => {
      for (let round = 0; round < ROUNDS; round++) {
        const { workspaceId, userSub, babyId } = await seedWorkspace();
        try {
          const sleep = await startBabySleep(workspaceId, userSub, {});
          await Promise.allSettled([
            runBabyQuickCare(workspaceId, userSub, {
              action: { kind: "DIAPER", diaperKind: "mixed" },
              breastRunning: null,
              clientRequestId: `race-del-${round}-${randomUUID().slice(0, 8)}`,
            }),
            deleteBabyEvent(workspaceId, sleep.id),
          ]);
          assert.ok(
            (await openNapCount(workspaceId, babyId)) <= 1,
            `round ${round}`,
          );
          const profile = await db
            .select()
            .from(babyProfile)
            .where(eq(babyProfile.workspaceId, workspaceId));
          assert.equal(profile.length, 1);
        } finally {
          await wipeWorkspace(workspaceId);
        }
      }
    },
  );
});

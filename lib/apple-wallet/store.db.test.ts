import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appleWalletDevice } from "@/db/schema/apple-wallet";
import { workspace } from "@/db/schema/workspace";
import { createDbAppleWalletStore } from "@/lib/apple-wallet/store";

/**
 * Drizzle store smoke (notifyCare upsert + softUnlink orphan prune).
 * Skip when DATABASE_URL is unset — same shape as workspace-reset / baby db tests.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

describe("createDbAppleWalletStore persistence", () => {
  async function seedWorkspace() {
    const workspaceId = randomUUID();
    const userSub = `aw-store-${workspaceId}`;
    await db.insert(workspace).values({
      id: workspaceId,
      name: "Apple wallet store",
      kind: "personal",
      ownedByUserSub: userSub,
      defaultCurrency: "USD",
    });
    return { workspaceId, userSub };
  }

  async function wipe(workspaceId: string) {
    await db.delete(workspace).where(eq(workspace.id, workspaceId));
  }

  it(
    "notifyCare upserts channel + bumps active subscriber; softUnlink prunes orphan device",
    { skip: !hasDb },
    async () => {
      const { workspaceId, userSub } = await seedWorkspace();
      const store = createDbAppleWalletStore();
      const now = new Date("2026-10-05T12:00:00.000Z");
      const serialNumber = `serial-${randomUUID()}`;
      const deviceLibraryId = `dev-${randomUUID()}`;
      try {
        await store.upsertSubscriberForIssue({
          workspaceId,
          userSub,
          serialNumber,
          authToken: "auth-token-16chars",
          now,
        });
        // upsertSubscriberForIssue must create channel_state in the same tx.
        const channelAfterUpsert = await store.getChannelLatest(workspaceId);
        assert.ok(channelAfterUpsert);
        assert.equal(channelAfterUpsert.latestMessage, "");
        await store.registerDevice({
          deviceLibraryId,
          pushToken: "abcdef0123456789",
          serialNumber,
          passTypeId: "pass.dev.myapps.test",
        });

        const notifyAt = new Date(now.getTime() + 60_000);
        await store.notifyCare(workspaceId, "Bottle 120ml", notifyAt);
        const channel = await store.getChannelLatest(workspaceId);
        assert.equal(channel?.latestMessage, "Bottle 120ml");
        const sub = await store.findSubscriberByWorkspaceUser(
          workspaceId,
          userSub,
        );
        assert.ok(sub);
        assert.equal(sub.updatedAt.getTime(), notifyAt.getTime());

        await store.softUnlink(workspaceId, userSub, notifyAt);
        assert.equal(await store.countRegistrations(serialNumber), 0);
        const devices = await db
          .select()
          .from(appleWalletDevice)
          .where(eq(appleWalletDevice.deviceLibraryId, deviceLibraryId));
        assert.equal(devices.length, 0);
        const removed = await store.findSubscriberByWorkspaceUser(
          workspaceId,
          userSub,
        );
        assert.equal(removed?.status, "removed");
      } finally {
        await wipe(workspaceId);
      }
    },
  );
});

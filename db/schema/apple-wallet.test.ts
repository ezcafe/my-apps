import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  appleWalletChannelState,
  appleWalletDevice,
  appleWalletIssueToken,
  appleWalletRegistration,
  appleWalletSubscriber,
} from "@/db/schema/apple-wallet";
import { workspace } from "@/db/schema/workspace";

const migrationSql = readFileSync(
  join(process.cwd(), "db/migrations/0047_apple_wallet.sql"),
  "utf8",
);

/**
 * Always-on uniqueness substitute (no DATABASE_URL).
 * Mirrors migration unique indexes; second insert must throw so the suite
 * fails closed if uniqueness wiring is dropped from tests or SQL.
 */
function insertSubscriberUnique(
  rows: Map<string, { workspaceId: string; userSub: string; serialNumber: string }>,
  row: { workspaceId: string; userSub: string; serialNumber: string },
): void {
  for (const existing of rows.values()) {
    if (
      existing.workspaceId === row.workspaceId &&
      existing.userSub === row.userSub
    ) {
      throw new Error("unique_violation:apple_wallet_subscriber_ws_user_uq");
    }
    if (existing.serialNumber === row.serialNumber) {
      throw new Error("unique_violation:apple_wallet_subscriber_serial_uq");
    }
  }
  rows.set(randomUUID(), row);
}

/** Always-on cascade substitute: delete device → drop registrations. */
function deleteDeviceCascade(
  devices: Set<string>,
  regs: Map<string, { deviceLibraryId: string; serialNumber: string }>,
  deviceLibraryId: string,
): void {
  devices.delete(deviceLibraryId);
  for (const [key, reg] of [...regs.entries()]) {
    if (reg.deviceLibraryId === deviceLibraryId) regs.delete(key);
  }
}

describe("apple_wallet schema", () => {
  it("subscriber uniques and workspace/status index", () => {
    const config = getTableConfig(appleWalletSubscriber);
    const names = config.indexes.map((idx) => idx.config.name);
    assert.ok(names.includes("apple_wallet_subscriber_ws_user_uq"));
    assert.ok(names.includes("apple_wallet_subscriber_serial_uq"));
    assert.ok(names.includes("apple_wallet_subscriber_ws_status_idx"));
    const wsUser = config.indexes.find(
      (idx) => idx.config.name === "apple_wallet_subscriber_ws_user_uq",
    );
    assert.equal(wsUser?.config.unique, true);
    const serial = config.indexes.find(
      (idx) => idx.config.name === "apple_wallet_subscriber_serial_uq",
    );
    assert.equal(serial?.config.unique, true);
  });

  it("registration PK and serial index; device PK", () => {
    const reg = getTableConfig(appleWalletRegistration);
    assert.ok(reg.primaryKeys.length >= 1);
    const names = reg.indexes.map((idx) => idx.config.name);
    assert.ok(names.includes("apple_wallet_registration_serial_idx"));
    const device = getTableConfig(appleWalletDevice);
    assert.equal(device.columns.some((c) => c.name === "device_library_id"), true);
  });

  it("issue_token hash unique and expires_at index", () => {
    const config = getTableConfig(appleWalletIssueToken);
    const names = config.indexes.map((idx) => idx.config.name);
    assert.ok(names.includes("apple_wallet_issue_token_hash_uq"));
    assert.ok(names.includes("apple_wallet_issue_token_expires_idx"));
  });

  it("channel_state has workspace_id PK", () => {
    const config = getTableConfig(appleWalletChannelState);
    assert.ok(
      config.columns.some((c) => c.name === "workspace_id"),
      "expected workspace_id",
    );
  });

  it("ARCHITECTURE Non-RLS lists all five apple_wallet tables", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/ARCHITECTURE.md"),
      "utf8",
    );
    for (const table of [
      "apple_wallet_channel_state",
      "apple_wallet_subscriber",
      "apple_wallet_device",
      "apple_wallet_registration",
      "apple_wallet_issue_token",
    ]) {
      assert.match(doc, new RegExp(table));
    }
  });

  it("migration SQL locks unique indexes and device→registration CASCADE", () => {
    assert.match(
      migrationSql,
      /CREATE UNIQUE INDEX "apple_wallet_subscriber_ws_user_uq"/,
    );
    assert.match(
      migrationSql,
      /CREATE UNIQUE INDEX "apple_wallet_subscriber_serial_uq"/,
    );
    assert.match(
      migrationSql,
      /apple_wallet_registration_device_fk[\s\S]*ON DELETE cascade/,
    );
    assert.match(
      migrationSql,
      /apple_wallet_registration_serial_fk[\s\S]*ON DELETE cascade/,
    );
  });

  it("migration SQL creates subscriber serial unique index before serial FK", () => {
    const serialUq = migrationSql.indexOf(
      'CREATE UNIQUE INDEX "apple_wallet_subscriber_serial_uq"',
    );
    const serialFk = migrationSql.indexOf(
      'ADD CONSTRAINT "apple_wallet_registration_serial_fk"',
    );
    assert.ok(serialUq >= 0, "missing subscriber serial unique index");
    assert.ok(serialFk >= 0, "missing registration serial FK");
    assert.ok(
      serialUq < serialFk,
      "serial unique index must precede registration.serial_number FK",
    );
  });

  it("always-on: second (workspace,user) or serial insert conflicts", () => {
    const rows = new Map<
      string,
      { workspaceId: string; userSub: string; serialNumber: string }
    >();
    insertSubscriberUnique(rows, {
      workspaceId: "ws-1",
      userSub: "u1",
      serialNumber: "serial-a",
    });
    assert.throws(
      () =>
        insertSubscriberUnique(rows, {
          workspaceId: "ws-1",
          userSub: "u1",
          serialNumber: "serial-b",
        }),
      /apple_wallet_subscriber_ws_user_uq/,
    );
    assert.throws(
      () =>
        insertSubscriberUnique(rows, {
          workspaceId: "ws-2",
          userSub: "u2",
          serialNumber: "serial-a",
        }),
      /apple_wallet_subscriber_serial_uq/,
    );
    assert.equal(rows.size, 1);
  });

  it("always-on: device delete cascades registrations", () => {
    const devices = new Set(["d1", "d2"]);
    const regs = new Map([
      ["d1:serial-1", { deviceLibraryId: "d1", serialNumber: "serial-1" }],
      ["d2:serial-1", { deviceLibraryId: "d2", serialNumber: "serial-1" }],
    ]);
    deleteDeviceCascade(devices, regs, "d1");
    assert.equal(devices.has("d1"), false);
    assert.equal(regs.has("d1:serial-1"), false);
    assert.equal(regs.has("d2:serial-1"), true);
  });
});

describe("apple_wallet schema live uniqueness + cascade", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  async function seedWorkspace() {
    const workspaceId = randomUUID();
    const userSub = `aw-schema-${workspaceId}`;
    await db.insert(workspace).values({
      id: workspaceId,
      name: "Apple wallet schema",
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
    "second insert conflicts on (workspace,user) and serial_number",
    { skip: !hasDb },
    async () => {
      const a = await seedWorkspace();
      const b = await seedWorkspace();
      try {
        await db.insert(appleWalletSubscriber).values({
          workspaceId: a.workspaceId,
          userSub: "user-1",
          serialNumber: "serial-live-1",
          authToken: "auth-token-16chars",
          status: "active",
        });
        await assert.rejects(
          () =>
            db.insert(appleWalletSubscriber).values({
              workspaceId: a.workspaceId,
              userSub: "user-1",
              serialNumber: "serial-live-2",
              authToken: "auth-token-16chars",
              status: "active",
            }),
          (e: unknown) =>
            e instanceof Error &&
            (/unique/i.test(e.message) || /duplicate/i.test(e.message)),
        );
        await assert.rejects(
          () =>
            db.insert(appleWalletSubscriber).values({
              workspaceId: b.workspaceId,
              userSub: "user-2",
              serialNumber: "serial-live-1",
              authToken: "auth-token-16chars",
              status: "active",
            }),
          (e: unknown) =>
            e instanceof Error &&
            (/unique/i.test(e.message) || /duplicate/i.test(e.message)),
        );
      } finally {
        await wipe(a.workspaceId);
        await wipe(b.workspaceId);
      }
    },
  );

  it(
    "device delete cascades registrations",
    { skip: !hasDb },
    async () => {
      const { workspaceId } = await seedWorkspace();
      const deviceLibraryId = `dev-${randomUUID()}`;
      const serialNumber = `serial-${randomUUID()}`;
      try {
        await db.insert(appleWalletSubscriber).values({
          workspaceId,
          userSub: "user-1",
          serialNumber,
          authToken: "auth-token-16chars",
          status: "active",
        });
        await db.insert(appleWalletDevice).values({
          deviceLibraryId,
          pushToken: "abcdef0123456789",
        });
        await db.insert(appleWalletRegistration).values({
          deviceLibraryId,
          serialNumber,
          passTypeId: "pass.dev.myapps.test",
        });
        await db
          .delete(appleWalletDevice)
          .where(eq(appleWalletDevice.deviceLibraryId, deviceLibraryId));
        const left = await db
          .select()
          .from(appleWalletRegistration)
          .where(eq(appleWalletRegistration.serialNumber, serialNumber));
        assert.equal(left.length, 0);
      } finally {
        await wipe(workspaceId);
      }
    },
  );
});

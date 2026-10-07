import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "@/db/schema/workspace";

/**
 * Per-workspace latest Wallet notification text (PassKit `latest` field).
 * Non-RLS — PassKit WS has no app.workspace_id session.
 */
export const appleWalletChannelState = pgTable("apple_wallet_channel_state", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspace.id, { onDelete: "cascade" }),
  latestMessage: text("latest_message").notNull().default(""),
  latestMessageAt: timestamp("latest_message_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * One pass serial per (workspace, user). Soft-unlink sets status=removed.
 */
export const appleWalletSubscriber = pgTable(
  "apple_wallet_subscriber",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    serialNumber: text("serial_number").notNull(),
    authToken: text("auth_token").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("apple_wallet_subscriber_ws_user_uq").on(
      t.workspaceId,
      t.userSub,
    ),
    uniqueIndex("apple_wallet_subscriber_serial_uq").on(t.serialNumber),
    index("apple_wallet_subscriber_ws_status_idx").on(
      t.workspaceId,
      t.status,
    ),
    check(
      "apple_wallet_subscriber_status_check",
      sql`${t.status} in ('active', 'removed')`,
    ),
  ],
);

/** Apple deviceLibraryIdentifier → push token. */
export const appleWalletDevice = pgTable("apple_wallet_device", {
  deviceLibraryId: text("device_library_id").primaryKey(),
  pushToken: text("push_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Device ↔ pass registration (multi-device per serial). */
export const appleWalletRegistration = pgTable(
  "apple_wallet_registration",
  {
    deviceLibraryId: text("device_library_id").notNull(),
    serialNumber: text("serial_number").notNull(),
    passTypeId: text("pass_type_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.deviceLibraryId, t.serialNumber],
      name: "apple_wallet_registration_pk",
    }),
    index("apple_wallet_registration_serial_idx").on(t.serialNumber),
    foreignKey({
      columns: [t.deviceLibraryId],
      foreignColumns: [appleWalletDevice.deviceLibraryId],
      name: "apple_wallet_registration_device_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.serialNumber],
      foreignColumns: [appleWalletSubscriber.serialNumber],
      name: "apple_wallet_registration_serial_fk",
    }).onDelete("cascade"),
  ],
);

/** Short-lived single-use QR issue tokens (mirror watch_pairing_code). */
export const appleWalletIssueToken = pgTable(
  "apple_wallet_issue_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("apple_wallet_issue_token_hash_uq").on(t.tokenHash),
    index("apple_wallet_issue_token_expires_idx").on(t.expiresAt),
  ],
);

export type AppleWalletSubscriberStatus = "active" | "removed";

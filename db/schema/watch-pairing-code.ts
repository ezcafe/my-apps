import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ApiTokenScope } from "@/db/schema/api-token";
import type { ShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";
import { workspace } from "@/db/schema/workspace";

/**
 * Short-lived device pairing codes. App-filtered (no workspace RLS).
 * Write owner: watch-pairing-service only.
 */
export const watchPairingCode = pgTable(
  "watch_pairing_code",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    apps: jsonb("apps").$type<ShareableWorkspaceAppKey[]>().notNull(),
    scopes: jsonb("scopes").$type<ApiTokenScope[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("watch_pairing_code_hash_uq").on(t.codeHash),
    index("watch_pairing_code_user_idx").on(t.userSub),
  ],
);

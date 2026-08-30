import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "@/db/schema/workspace";

export const API_TOKEN_SCOPES = ["read", "write"] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

export const apiToken = pgTable(
  "api_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Product area; v1 tokens are Money-only */
    appKey: text("app_key").notNull().default("money"),
    name: text("name").notNull(),
    /** First 12 characters of the full token (includes `mny_` prefix) */
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    /** SHA-256 hex of secret for O(1) lookup; null on legacy tokens */
    keyLookup: text("key_lookup"),
    scopes: jsonb("scopes").$type<ApiTokenScope[]>().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("api_token_user_idx").on(t.userSub),
    index("api_token_prefix_idx").on(t.keyPrefix),
    index("api_token_workspace_idx").on(t.workspaceId),
    uniqueIndex("api_token_key_lookup_uq")
      .on(t.keyLookup)
      .where(sql`${t.keyLookup} IS NOT NULL`),
  ],
);

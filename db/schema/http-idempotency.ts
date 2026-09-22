import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspace } from "@/db/schema/workspace";

/**
 * Durable Idempotency-Key store for hot mutating REST.
 * No workspace RLS — app filters by workspace_id + user_sub from auth.
 */
export const httpIdempotency = pgTable(
  "http_idempotency",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    route: text("route").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique("http_idempotency_workspace_user_route_key_uq").on(
      t.workspaceId,
      t.userSub,
      t.route,
      t.key,
    ),
    index("http_idempotency_expires_idx").on(t.expiresAt),
    check(
      "http_idempotency_status_check",
      sql`${t.status} IN ('in_progress', 'completed')`,
    ),
  ],
);

export type HttpIdempotencyStatus = "in_progress" | "completed";

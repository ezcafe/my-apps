import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Fixed-window rate limit counters (GraphQL and other API surfaces). */
export const securityRateLimit = pgTable(
  "security_rate_limit",
  {
    key: text("key").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.bucketStart] }),
    index("security_rate_limit_bucket_idx").on(t.bucketStart),
  ],
);

import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Registered product areas that use workspace isolation + per-app default/cookie.
 * Add keys here when introducing domains (e.g. notes, tasks).
 */
export const WORKSPACE_APP_KEYS = ["money", "notes", "tasks"] as const;
export type WorkspaceAppKey = (typeof WORKSPACE_APP_KEYS)[number];

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "member",
]);

export const workspaceKindEnum = pgEnum("workspace_kind", ["personal", "shared"]);

export const workspace = pgTable(
  "workspace",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: workspaceKindEnum("kind").notNull(),
    /** Set when kind is personal; null for shared workspaces. At most one row per user (partial unique). */
    ownedByUserSub: text("owned_by_user_sub"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "workspace_kind_owned_ck",
      sql`(${t.kind} = 'personal' AND ${t.ownedByUserSub} IS NOT NULL) OR (${t.kind} = 'shared' AND ${t.ownedByUserSub} IS NULL)`,
    ),
    uniqueIndex("workspace_owned_by_user_sub_uq")
      .on(t.ownedByUserSub)
      .where(sql`${t.ownedByUserSub} IS NOT NULL`),
  ],
);

export const workspaceMember = pgTable(
  "workspace_member",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userSub] }),
    index("workspace_member_user_idx").on(t.userSub),
  ],
);

export const userWorkspaceDefault = pgTable(
  "user_workspace_default",
  {
    userSub: text("user_sub").notNull(),
    appKey: text("app_key").notNull(),
    defaultWorkspaceId: uuid("default_workspace_id").references(
      () => workspace.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    primaryKey({ columns: [t.userSub, t.appKey] }),
    index("user_workspace_default_workspace_idx").on(t.defaultWorkspaceId),
  ],
);

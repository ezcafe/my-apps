import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspace } from "./workspace";

export const babyCareEventTypeEnum = pgEnum("baby_care_event_type", [
  "feed",
  "diaper",
  "sleep",
]);

export const babyCareEventSourceEnum = pgEnum("baby_care_event_source", [
  "web",
  "telegram",
]);

export const babyGrowthKindEnum = pgEnum("baby_growth_kind", [
  "weight",
  "height",
  "head",
  "temperature",
  "medication",
]);

export type BabyFeedPayload = {
  method: "breast_l" | "breast_r" | "formula" | "pump";
  durationSec?: number;
  amountMl?: number;
  notes?: string;
};

export type BabyDiaperPayload = {
  kind: "wet" | "dirty" | "mixed";
  notes?: string;
};

export type BabySleepPayload = {
  notes?: string;
};

export type BabyCarePayload =
  | BabyFeedPayload
  | BabyDiaperPayload
  | BabySleepPayload;

/** One baby profile per workspace. */
export const babyProfile = pgTable(
  "baby_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull().default("Baby"),
    birthDate: text("birth_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("baby_profile_workspace_uq").on(t.workspaceId),
  ],
);

export const babyCareEvent = pgTable(
  "baby_care_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babyProfile.id, { onDelete: "cascade" }),
    type: babyCareEventTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    payload: jsonb("payload").$type<BabyCarePayload>().notNull().default({}),
    source: babyCareEventSourceEnum("source").notNull().default("web"),
    createdByUserSub: text("created_by_user_sub").notNull(),
    updatedByUserSub: text("updated_by_user_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("baby_care_event_workspace_occurred_idx").on(
      t.workspaceId,
      t.occurredAt,
    ),
    index("baby_care_event_baby_type_idx").on(t.babyId, t.type),
    uniqueIndex("baby_care_event_open_sleep_uq")
      .on(t.babyId)
      .where(sql`${t.type} = 'sleep' AND ${t.endedAt} IS NULL`),
  ],
);

export const babyGrowthEntry = pgTable(
  "baby_growth_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babyProfile.id, { onDelete: "cascade" }),
    kind: babyGrowthKindEnum("kind").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    valueNum: numeric("value_num", { precision: 12, scale: 4 }),
    valueText: text("value_text"),
    unit: text("unit"),
    notes: text("notes"),
    source: babyCareEventSourceEnum("source").notNull().default("web"),
    createdByUserSub: text("created_by_user_sub").notNull(),
    updatedByUserSub: text("updated_by_user_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("baby_growth_entry_workspace_recorded_idx").on(
      t.workspaceId,
      t.recordedAt,
    ),
    index("baby_growth_entry_baby_kind_idx").on(t.babyId, t.kind),
  ],
);

/** Model B: one shared family chat per workspace. */
export const babyTelegramLink = pgTable(
  "baby_telegram_link",
  {
    workspaceId: uuid("workspace_id")
      .primaryKey()
      .references(() => workspace.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    linkedByUserSub: text("linked_by_user_sub").notNull(),
    /** Null until webhook sees a message from this chatId (ownership confirm). */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("baby_telegram_link_chat_uq").on(t.chatId)],
);

export const babyVaccineDoseEnum = pgEnum("baby_vaccine_dose", [
  "first",
  "second",
]);

/** Log-only vaccine doses (not care events, not growth). */
export const babyVaccineEntry = pgTable(
  "baby_vaccine_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    babyId: uuid("baby_id")
      .notNull()
      .references(() => babyProfile.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: babyVaccineDoseEnum("dose").notNull(),
    administeredAt: timestamp("administered_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    source: babyCareEventSourceEnum("source").notNull().default("web"),
    createdByUserSub: text("created_by_user_sub").notNull(),
    updatedByUserSub: text("updated_by_user_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("baby_vaccine_entry_workspace_administered_idx").on(
      t.workspaceId,
      t.administeredAt,
    ),
    index("baby_vaccine_entry_baby_administered_idx").on(
      t.babyId,
      t.administeredAt,
    ),
  ],
);

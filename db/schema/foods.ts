import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const foodMealSlotEnum = pgEnum("food_meal_slot", [
  "breakfast",
  "lunch",
  "dinner",
]);

export const foodAnalysisStatusEnum = pgEnum("food_analysis_status", [
  "ok",
  "error",
]);

export const foodLogEntry = pgTable(
  "food_log_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    loggedOn: text("logged_on").notNull(),
    foodType: text("food_type").notNull(),
    mealSlot: foodMealSlotEnum("meal_slot"),
    note: text("note"),
    createdByUserSub: text("created_by_user_sub").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("food_log_entry_workspace_logged_on_idx").on(
      t.workspaceId,
      t.loggedOn,
    ),
  ],
);

export const foodAnalysis = pgTable(
  "food_analysis",
  {
    workspaceId: uuid("workspace_id")
      .primaryKey()
      .references(() => workspace.id, { onDelete: "cascade" }),
    summary: text("summary").notNull().default(""),
    suggestions: jsonb("suggestions").$type<string[]>().notNull().default([]),
    windowStart: text("window_start"),
    windowEnd: text("window_end"),
    entryHash: text("entry_hash"),
    status: foodAnalysisStatusEnum("status").notNull().default("ok"),
    errorMessage: text("error_message"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("food_analysis_workspace_uq").on(t.workspaceId)],
);

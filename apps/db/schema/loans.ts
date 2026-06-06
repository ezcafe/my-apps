import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const loanCalculationMethodEnum = pgEnum("loan_calculation_method", [
  "nominal_monthly",
  "sc_vn_calculator",
  "sc_vn_actual_365",
]);

export const loanStatusEnum = pgEnum("loan_status", [
  "active",
  "paid_off",
  "cancelled",
]);

export const loanPayStatusEnum = pgEnum("loan_pay_status", [
  "pending",
  "paid",
  "skipped",
]);

export const loan = pgTable(
  "loan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    principalMinor: bigint("principal_minor", { mode: "number" }).notNull(),
    annualRateBps: integer("annual_rate_bps").notNull(),
    termMonths: integer("term_months").notNull(),
    startDate: text("start_date").notNull(),
    dueDayOfMonth: integer("due_day_of_month").notNull(),
    paymentMinor: bigint("payment_minor", { mode: "number" }).notNull(),
    calculationMethod: loanCalculationMethodEnum("calculation_method")
      .notNull()
      .default("nominal_monthly"),
    collateralValueMinor: bigint("collateral_value_minor", { mode: "number" }),
    moneyAccountId: uuid("money_account_id"),
    moneyCategoryId: uuid("money_category_id"),
    status: loanStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("loan_workspace_idx").on(t.workspaceId),
    check(
      "loan_due_day_ck",
      sql`${t.dueDayOfMonth} >= 1 AND ${t.dueDayOfMonth} <= 28`,
    ),
    check("loan_term_ck", sql`${t.termMonths} >= 1`),
    check("loan_principal_ck", sql`${t.principalMinor} > 0`),
  ],
);

export const loanScheduleInstallment = pgTable(
  "loan_schedule_installment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loan.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull(),
    dueDate: text("due_date").notNull(),
    paymentMinor: bigint("payment_minor", { mode: "number" }).notNull(),
    principalMinor: bigint("principal_minor", { mode: "number" }).notNull(),
    interestMinor: bigint("interest_minor", { mode: "number" }).notNull(),
    balanceAfterMinor: bigint("balance_after_minor", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("loan_schedule_installment_loan_num_uq").on(
      t.loanId,
      t.installmentNumber,
    ),
    index("loan_schedule_installment_due_idx").on(t.dueDate),
  ],
);

export const loanInstallmentStatus = pgTable(
  "loan_installment_status",
  {
    scheduleInstallmentId: uuid("schedule_installment_id")
      .primaryKey()
      .references(() => loanScheduleInstallment.id, { onDelete: "cascade" }),
    status: loanPayStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    moneyTransactionId: uuid("money_transaction_id"),
    paidWithoutTransaction: boolean("paid_without_transaction")
      .notNull()
      .default(false),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
  },
  (t) => [index("loan_installment_status_pending_idx").on(t.status)],
);

export const loanPushSubscription = pgTable(
  "loan_push_subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userSub: text("user_sub").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("loan_push_subscription_user_endpoint_uq").on(
      t.userSub,
      t.endpoint,
    ),
    index("loan_push_subscription_user_idx").on(t.userSub),
  ],
);

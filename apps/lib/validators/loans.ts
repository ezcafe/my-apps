import { z } from "zod";

export const loanCalculationMethodSchema = z.enum([
  "nominal_monthly",
  "sc_vn_calculator",
  "sc_vn_actual_365",
]);

export const loanCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  principalMinor: z.number().int().positive(),
  annualRateBps: z.number().int().min(0).max(100_000),
  termMonths: z.number().int().min(1).max(600),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDayOfMonth: z.number().int().min(1).max(28),
  paymentMinor: z.number().int().positive().optional(),
  calculationMethod: loanCalculationMethodSchema.default("nominal_monthly"),
  collateralValueMinor: z.number().int().positive().optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  moneyCategoryId: z.string().uuid().optional().nullable(),
  autoMarkPastDuePaid: z.boolean().optional().default(false),
  autoMarkPastDueWithoutTransaction: z.boolean().optional().default(true),
});

export const loanInstallmentMarkPaidSchema = z.object({
  scheduleInstallmentId: z.string().uuid(),
});

export const loanInstallmentPayWithTransactionSchema = z.object({
  scheduleInstallmentId: z.string().uuid(),
  moneyWorkspaceId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  amountMinor: z.number().int().positive().optional(),
});

export const loanPushSubscriptionSaveSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const loanPushSubscriptionDeleteSchema = z.object({
  endpoint: z.string().url(),
});

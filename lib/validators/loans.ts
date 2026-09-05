import { z } from "zod";

export const loanCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    principalMinor: z.number().int().positive(),
    annualRateBps: z.number().int().min(0).max(100_000),
    termMonths: z.number().int().min(1).max(600),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDayOfMonth: z.number().int().min(1).max(28),
    paymentMinor: z.number().int().positive().optional(),
    initialRateMonths: z.number().int().min(1).max(600).optional().nullable(),
    rateAfterInitialBps: z.number().int().min(0).max(100_000).optional().nullable(),
    paymentAfterRateChangeMinor: z.number().int().positive().optional().nullable(),
    collateralValueMinor: z.number().int().positive().optional().nullable(),
    moneyAccountId: z.string().uuid().optional().nullable(),
    moneyCategoryId: z.string().uuid().optional().nullable(),
    autoMarkPastDuePaid: z.boolean().optional().default(false),
    autoMarkPastDueWithoutTransaction: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const hasPartialRatePeriod =
      data.initialRateMonths != null &&
      data.initialRateMonths > 0 &&
      data.initialRateMonths < data.termMonths;
    if (hasPartialRatePeriod && data.rateAfterInitialBps == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Rate after initial period is required when the initial rate period is shorter than the loan term",
        path: ["rateAfterInitialBps"],
      });
    }
  });

export const loanUpdateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    principalMinor: z.number().int().positive(),
    annualRateBps: z.number().int().min(0).max(100_000),
    termMonths: z.number().int().min(1).max(600),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDayOfMonth: z.number().int().min(1).max(28),
    paymentMinor: z.number().int().positive().optional().nullable(),
    initialRateMonths: z.number().int().min(1).max(600).optional().nullable(),
    rateAfterInitialBps: z.number().int().min(0).max(100_000).optional().nullable(),
    paymentAfterRateChangeMinor: z.number().int().positive().optional().nullable(),
    collateralValueMinor: z.number().int().positive().optional().nullable(),
    moneyAccountId: z.string().uuid().optional().nullable(),
    moneyCategoryId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasPartialRatePeriod =
      data.initialRateMonths != null &&
      data.initialRateMonths > 0 &&
      data.initialRateMonths < data.termMonths;
    if (hasPartialRatePeriod && data.rateAfterInitialBps == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Rate after initial period is required when the initial rate period is shorter than the loan term",
        path: ["rateAfterInitialBps"],
      });
    }
  });

export const loanInstallmentMarkPaidSchema = z.object({
  scheduleInstallmentId: z.string().uuid(),
});

export const loanInstallmentPayWithTransactionSchema = z.object({
  scheduleInstallmentId: z.string().uuid(),
  moneyWorkspaceId: z.string().uuid().optional(),
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

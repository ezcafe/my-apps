import { z } from "zod";

export const savingsActivityTypeSchema = z.enum([
  "deposit",
  "withdraw",
  "interest",
]);

export const savingsAccountCreateSchema = z.object({
  name: z.string().min(1).max(200),
  currency: z.string().min(3).max(3).default("USD"),
  sortOrder: z.number().int().optional(),
});

export const savingsAccountUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currency: z.string().min(3).max(3).optional(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const savingsActivityCreateSchema = z.object({
  accountId: z.string().uuid(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: savingsActivityTypeSchema,
  amountMinor: z.number().int().positive(),
  notes: z.string().max(2000).optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  moneyTransactionId: z.string().uuid().optional().nullable(),
});

export const savingsActivityUpdateSchema = savingsActivityCreateSchema
  .partial()
  .extend({
    accountId: z.string().uuid().optional(),
    type: savingsActivityTypeSchema.optional(),
    amountMinor: z.number().int().positive().optional(),
  });

export const savingsActivitiesQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().uuid().optional(),
});

export const savingsBalanceSeriesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

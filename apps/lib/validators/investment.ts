import { z } from "zod";

export const investmentInstrumentKindSchema = z.enum(["stocks", "coins", "fx"]);

export const investmentActivityTypeSchema = z.enum([
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
  "deposit",
  "withdraw",
]);

export const investmentInstrumentCreateSchema = z.object({
  kind: investmentInstrumentKindSchema,
  name: z.string().min(1).max(200),
  currency: z.string().min(3).max(3).default("USD"),
  symbol: z.string().min(1).max(32),
  yahooSymbol: z.string().min(1).max(32).optional().nullable(),
});

export const investmentInstrumentUpdateSchema =
  investmentInstrumentCreateSchema.partial().extend({
    archived: z.boolean().optional(),
  });

export const investmentActivityCreateSchema = z.object({
  instrumentId: z.string().uuid(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: investmentActivityTypeSchema,
  quantity: z.string().optional().nullable(),
  unitPriceMinor: z.number().int().optional().nullable(),
  amountMinor: z.number().int().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  moneyTransactionId: z.string().uuid().optional().nullable(),
});

export const investmentActivityUpdateSchema = investmentActivityCreateSchema
  .partial()
  .extend({
    instrumentId: z.string().uuid().optional(),
    type: investmentActivityTypeSchema.optional(),
  });

export const investmentActivitiesQuerySchema = z.object({
  instrumentId: z.string().uuid().optional(),
  kind: investmentInstrumentKindSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().uuid().optional(),
});

export const investmentPortfolioSeriesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

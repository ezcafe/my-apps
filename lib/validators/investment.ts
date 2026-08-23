import { z } from "zod";
import { INVESTMENT_INSTRUMENT_KINDS } from "@/lib/investment-instrument-kind";

export const investmentInstrumentKindSchema = z.enum(
  INVESTMENT_INSTRUMENT_KINDS,
);

export const investmentActivityTypeSchema = z.enum([
  "buy",
  "sell",
  "dividend",
  "fee",
  "adjustment",
  "deposit",
  "withdraw",
]);

export const investmentOpenTypeSchema = z.enum(["buy", "sell"]);

export const investmentCashMoveTypeSchema = z.enum(["deposit", "withdraw"]);

function optionalNumericString(value: string | null | undefined): boolean {
  if (value == null || value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n);
}

function positiveNumericString(value: string | null | undefined): boolean {
  if (value == null || value.trim() === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export const investmentInstrumentCreateSchema = z.object({
  kind: investmentInstrumentKindSchema,
  name: z.string().min(1).max(200).optional(),
  currency: z.string().min(3).max(3).default("USD"),
  symbol: z.string().min(1).max(32),
  yahooSymbol: z.string().min(1).max(32).optional().nullable(),
  contractSize: z.string().optional().nullable(),
  moneyAccountId: z.string().uuid(),
  incomeCategoryId: z.string().uuid(),
  expenseCategoryId: z.string().uuid(),
});

export const investmentInstrumentUpdateSchema =
  investmentInstrumentCreateSchema.partial().extend({
    archived: z.boolean().optional(),
  });

/** Open a trade on the journal (no money_transaction). */
export const investmentActivityCreateSchema = z
  .object({
    instrumentId: z.string().uuid(),
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: investmentOpenTypeSchema,
    quantity: z.string().optional().nullable(),
    unitPriceMinor: z.number().int().optional().nullable(),
    openPrice: z.string().optional().nullable(),
    stopLoss: z.string().optional().nullable(),
    takeProfit: z.string().optional().nullable(),
    amountMinor: z.number().int().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    moneyAccountId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    moneyTransactionId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!positiveNumericString(data.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity must be positive",
        path: ["quantity"],
      });
    }
    if (!positiveNumericString(data.openPrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Open price must be positive",
        path: ["openPrice"],
      });
    }
    if (data.amountMinor != null && data.amountMinor < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Commission cannot be negative",
        path: ["amountMinor"],
      });
    }
    for (const key of ["openPrice", "stopLoss", "takeProfit"] as const) {
      if (!optionalNumericString(data[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a number",
          path: [key],
        });
      }
    }
  });

export const investmentActivityUpdateSchema = z.object({
  instrumentId: z.string().uuid().optional(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: investmentOpenTypeSchema.optional(),
  quantity: z.string().optional().nullable(),
  unitPriceMinor: z.number().int().optional().nullable(),
  openPrice: z.string().optional().nullable(),
  stopLoss: z.string().optional().nullable(),
  takeProfit: z.string().optional().nullable(),
  amountMinor: z.number().int().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  moneyTransactionId: z.string().uuid().optional().nullable(),
});

export const investmentActivityCloseSchema = z.object({
  id: z.string().uuid(),
  closePrice: z.string().refine(positiveNumericString, "Close price must be positive"),
  feeMinor: z.number().int().min(0).optional().nullable(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  fxRate: z.number().positive().optional().nullable(),
});

export const investmentActivityRealizeSchema = z
  .object({
    instrumentId: z.string().uuid(),
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    quantity: z.string(),
    openPrice: z.string(),
    closePrice: z.string(),
    feeMinor: z.number().int().min(0).optional().nullable(),
    type: investmentOpenTypeSchema,
    priceCurrency: z
      .string()
      .length(3)
      .transform((s) => s.toUpperCase()),
    fxRate: z.number().positive(),
    notes: z.string().max(2000).optional().nullable(),
    moneyAccountId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!positiveNumericString(data.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity must be positive",
        path: ["quantity"],
      });
    }
    if (!positiveNumericString(data.openPrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Open price must be positive",
        path: ["openPrice"],
      });
    }
    if (!positiveNumericString(data.closePrice)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Close price must be positive",
        path: ["closePrice"],
      });
    }
  });

export const investmentActivityCashMoveSchema = z.object({
  instrumentId: z.string().uuid(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: investmentCashMoveTypeSchema,
  amountMinor: z.number().int().positive(),
  feeMinor: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  moneyAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

export const investmentActivitiesQuerySchema = z.object({
  instrumentId: z.string().uuid().optional(),
  kind: investmentInstrumentKindSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().uuid().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

export const investmentPortfolioSeriesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

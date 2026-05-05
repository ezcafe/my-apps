import { z } from "zod";

export const transactionKindSchema = z.enum(["expense", "income", "transfer"]);

export const transactionCreateSchema = z.object({
  accountId: z.string().uuid(),
  kind: transactionKindSchema.optional().default("expense"),
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  merchantId: z.string().uuid().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  /** Resolved to existing tags or created when the transaction is created. */
  tagNames: z.array(z.string().max(120)).max(50).optional(),
});

export const transactionUpdateSchema = transactionCreateSchema
  .partial()
  .omit({ tagNames: true });

export const accountCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z
    .enum([
      "checking",
      "savings",
      "cash",
      "credit",
      "loan",
      "investment",
      "other",
    ])
    .optional(),
  currency: z.string().min(3).max(3).optional(),
  institution: z.string().max(200).optional().nullable(),
  balanceMinor: z.number().int().optional().default(0),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().optional().nullable(),
  archived: z.boolean().optional(),
});

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
});

export const merchantCreateSchema = z.object({
  name: z.string().min(1).max(200),
  normalizedName: z.string().max(200).optional().nullable(),
});

export const ruleMatchSchema = z
  .object({
    merchantId: z.string().uuid().optional(),
    accountId: z.string().uuid().optional(),
  })
  .refine((m) => Boolean(m.accountId || m.merchantId), {
    message: "Rule match must include at least an account or a merchant",
  });

export const ruleActionSchema = z.object({
  setCategoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const ruleCreateSchema = z.object({
  name: z.string().min(1).max(200),
  priority: z.number().int().optional(),
  match: ruleMatchSchema,
  action: ruleActionSchema,
  active: z.boolean().optional(),
});

export const recurrentTemplateBodySchema = z.object({
  accountId: z.string().uuid(),
  kind: transactionKindSchema,
  amountMinor: z.number().int().positive(),
  categoryId: z.string().uuid().optional().nullable(),
  merchantId: z.string().uuid().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const recurrentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  cadence: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  nextRunAt: z.string().datetime({ offset: true }),
  template: recurrentTemplateBodySchema,
  active: z.boolean().optional(),
});

export const budgetCreateSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
  limitAmountMinor: z.number().int().positive(),
  currency: z.string().min(3).max(3).optional(),
});

export const analyticsFiltersSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  merchantIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  kinds: z.array(transactionKindSchema).optional(),
});

export const transactionListSortSchema = z.enum([
  "occurredAt",
  "amountMinor",
  "kind",
  "createdAt",
]);

export type TransactionListSortKey = z.infer<typeof transactionListSortSchema>;

export const transactionListQuerySchema = analyticsFiltersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: transactionListSortSchema.default("occurredAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

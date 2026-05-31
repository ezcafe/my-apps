import { z } from "zod";
import {
  DEV_RECURRENCE_FORM_CADENCES,
  RECURRENCE_FORM_CADENCES,
  recurrenceCadenceAllowedInCurrentEnv,
} from "@/lib/recurrence";

export const transactionKindSchema = z.enum(["expense", "income", "transfer"]);

export const categoryKindSchema = z.enum(["expense", "income"]);
export type CategoryKind = z.infer<typeof categoryKindSchema>;

const transactionBaseSchema = z.object({
  accountId: z.string().uuid(),
  toAccountId: z.string().uuid().optional().nullable(),
  kind: transactionKindSchema.optional().default("expense"),
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  merchantId: z.string().uuid().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  /** Resolved to existing tags or created when the transaction is created. */
  tagNames: z.array(z.string().max(120)).max(50).optional(),
  recurrence: z
    .object({
      cadence: z.enum([
        ...RECURRENCE_FORM_CADENCES,
        ...DEV_RECURRENCE_FORM_CADENCES,
      ]),
      name: z.string().min(1).max(200).optional(),
    })
    .optional(),
});

export const transactionCreateSchema = transactionBaseSchema.superRefine((data, ctx) => {
  if (data.recurrence && data.kind === "transfer") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrence"],
      message: "Recurring transfers are not supported",
    });
  }
  if (
    data.recurrence &&
    !recurrenceCadenceAllowedInCurrentEnv(data.recurrence.cadence)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrence", "cadence"],
      message: "Recurrence cadence is not available in production",
    });
  }
  if (data.kind !== "transfer") return;
  if (!data.toAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toAccountId"],
      message: "toAccountId is required for transfer",
    });
    return;
  }
  if (data.toAccountId === data.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toAccountId"],
      message: "toAccountId must be different from accountId",
    });
  }
});

export const transactionUpdateSchema = transactionBaseSchema
  .partial()
  .omit({ tagNames: true, recurrence: true })
  .superRefine((data, ctx) => {
    if (data.kind !== "transfer") return;
    if (!data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "toAccountId is required for transfer",
      });
      return;
    }
    if (data.accountId && data.toAccountId === data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "toAccountId must be different from accountId",
      });
    }
  });

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
  institution: z.string().max(200).optional().nullable(),
  balanceMinor: z.number().int().optional().default(0),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  kind: categoryKindSchema,
  parentId: z.string().uuid().optional().nullable(),
  archived: z.boolean().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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
  kind: categoryKindSchema,
  priority: z.number().int().optional(),
  match: ruleMatchSchema,
  action: ruleActionSchema,
  active: z.boolean().optional(),
});

export const ruleUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  priority: z.number().int().optional(),
  match: ruleMatchSchema.optional(),
  action: ruleActionSchema.optional(),
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

export const recurrentCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    cadence: z.enum([
      "every_5_minutes",
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "quarterly",
      "yearly",
    ]),
    nextRunAt: z.string().datetime({ offset: true }),
    template: recurrentTemplateBodySchema,
    active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!recurrenceCadenceAllowedInCurrentEnv(data.cadence)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cadence"],
        message: "Recurrence cadence is not available in production",
      });
    }
  });

export const moneyBudgetScopeTypeSchema = z.enum([
  "workspace",
  "category",
  "account",
  "tag",
]);

export const budgetCreateSchema = z
  .object({
    scopeType: moneyBudgetScopeTypeSchema,
    scopeId: z.string().uuid().optional().nullable(),
    limitAmountMinor: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === "workspace") {
      if (data.scopeId != null && data.scopeId !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scopeId"],
          message: "scopeId must be omitted for workspace budgets",
        });
      }
    } else if (!data.scopeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeId"],
        message: "scopeId is required for category, account, and tag budgets",
      });
    }
  });

export const analyticsRecurrenceFilterSchema = z.enum(["recurring", "one-time"]);

export const analyticsFiltersSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  merchantIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  kinds: z.array(transactionKindSchema).optional(),
  recurrence: analyticsRecurrenceFilterSchema.optional(),
  recurrenceSourceIds: z.array(z.string().uuid()).optional(),
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

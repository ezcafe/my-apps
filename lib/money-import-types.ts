import { z } from "zod";
import {
  categoryCreateSchema,
  transactionCreateSchema,
} from "@/lib/validators/money";

export const moneyImportTypes = [
  "accounts",
  "categories",
  "budgets",
  "transactions",
  "rules",
  "recurrence",
] as const;

export type MoneyImportType = (typeof moneyImportTypes)[number];

export const moneyImportTypeSchema = z.enum(moneyImportTypes);

/** Category CSV may include batch refs; stripped before DB insert. */
export const categoryImportRowSchema = categoryCreateSchema
  .extend({
    sourceId: z.string().uuid().optional(),
    parentSourceId: z.string().uuid().optional(),
  })
  .superRefine((row, ctx) => {
    if (row.parentId != null && row.parentSourceId != null) {
      ctx.addIssue({
        code: "custom",
        message: "Use only one of parentId or parentSourceId",
        path: ["parentId"],
      });
    }
  });

export const transactionImportRowSchema = transactionCreateSchema.extend({
  transferGroupId: z.string().min(1).max(200).optional(),
});

export type CategoryImportRow = z.infer<typeof categoryImportRowSchema>;
export type TransactionImportRow = z.infer<typeof transactionImportRowSchema>;

export const importPreviewResponseSchema = z.object({
  /** Server-side stash key for validated rows; discard via abandon or by committing. */
  previewId: z.string().uuid(),
  /** Original CSV header cells (first row), in order. */
  csvHeaders: z.array(z.string()),
  rows: z.array(z.unknown()),
  errors: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      message: z.string(),
    }),
  ),
  warnings: z.array(
    z.object({
      rowNumber: z.number().int().positive().optional(),
      message: z.string(),
    }),
  ),
  summary: z.object({
    total: z.number().int(),
    valid: z.number().int(),
    invalid: z.number().int(),
  }),
});

export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;

/** Built by CSV parse; `previewId` is added in the preview API route. */
export type ImportPreviewPayload = Omit<ImportPreviewResponse, "previewId">;

export const importAbandonBodySchema = z.object({
  previewId: z.string().uuid(),
});

export const importCommitBodySchema = z
  .object({
    type: moneyImportTypeSchema,
    rows: z.array(z.unknown()).optional(),
    previewId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    const hasId = val.previewId != null;
    const rowCount = val.rows?.length ?? 0;
    if (hasId && rowCount > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Use either previewId or rows, not both",
        path: ["rows"],
      });
    }
    if (!hasId && rowCount === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Send previewId from preview, or a non-empty rows array",
        path: ["rows"],
      });
    }
  });

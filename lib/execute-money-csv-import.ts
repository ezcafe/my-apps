import { db } from "@/db";
import { moneyMerchant, moneyTag } from "@/db/schema/money";
import { commitMoneyImport } from "@/lib/money-import";
import type { MoneyImportKind } from "@/lib/money-import-kinds";
import type { MoneyImportType } from "@/lib/money-import-types";
import { merchantCreateSchema, tagCreateSchema } from "@/lib/validators/money";

type MoneyCtx = { userSub: string; workspaceId: string };

export async function executeMoneyCsvImport(
  ctx: MoneyCtx,
  kind: MoneyImportKind,
  rows: unknown[],
): Promise<number> {
  if (kind === "merchants") {
    let n = 0;
    for (const row of rows) {
      const p = merchantCreateSchema.safeParse(row);
      if (!p.success) {
        throw new Error(p.error.issues.map((i) => i.message).join("; "));
      }
      await db.insert(moneyMerchant).values({
        workspaceId: ctx.workspaceId,
        name: p.data.name,
        normalizedName:
          p.data.normalizedName ??
          p.data.name.toLowerCase().replace(/\s+/g, " ").trim(),
      });
      n++;
    }
    return n;
  }
  if (kind === "tags") {
    let n = 0;
    for (const row of rows) {
      const p = tagCreateSchema.safeParse(row);
      if (!p.success) {
        throw new Error(p.error.issues.map((i) => i.message).join("; "));
      }
      await db.insert(moneyTag).values({
        workspaceId: ctx.workspaceId,
        name: p.data.name,
        color: p.data.color ?? null,
      });
      n++;
    }
    return n;
  }
  return commitMoneyImport(ctx, kind as MoneyImportType, rows);
}

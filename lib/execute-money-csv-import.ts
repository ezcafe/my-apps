import { db } from "@/db";
import { moneyMerchant, moneyTag } from "@/db/schema/money";
import { commitMoneyImport } from "@/lib/money-import";
import type { MoneyImportIdMaps } from "@/lib/money-import-id-maps";
import type { MoneyImportKind } from "@/lib/money-import-kinds";
import type { MoneyImportType } from "@/lib/money-import-types";
import { merchantCreateSchema, tagCreateSchema } from "@/lib/validators/money";

type MoneyCtx = { userSub: string; workspaceId: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function executeMoneyCsvImport(
  ctx: MoneyCtx,
  kind: MoneyImportKind,
  rows: unknown[],
  idMaps?: MoneyImportIdMaps,
): Promise<number> {
  if (kind === "merchants") {
    let n = 0;
    for (const row of rows) {
      const raw = row as Record<string, unknown>;
      const p = merchantCreateSchema.safeParse(row);
      if (!p.success) {
        throw new Error(p.error.issues.map((i) => i.message).join("; "));
      }
      const [ins] = await db
        .insert(moneyMerchant)
        .values({
          workspaceId: ctx.workspaceId,
          name: p.data.name,
          normalizedName:
            p.data.normalizedName ??
            p.data.name.toLowerCase().replace(/\s+/g, " ").trim(),
        })
        .returning({ id: moneyMerchant.id });
      const sourceId =
        typeof raw.sourceId === "string" && UUID_RE.test(raw.sourceId)
          ? raw.sourceId
          : undefined;
      if (sourceId && idMaps && ins) idMaps.merchants.set(sourceId, ins.id);
      n++;
    }
    return n;
  }
  if (kind === "tags") {
    let n = 0;
    for (const row of rows) {
      const raw = row as Record<string, unknown>;
      const p = tagCreateSchema.safeParse(row);
      if (!p.success) {
        throw new Error(p.error.issues.map((i) => i.message).join("; "));
      }
      const [ins] = await db
        .insert(moneyTag)
        .values({
          workspaceId: ctx.workspaceId,
          name: p.data.name,
          color: p.data.color ?? null,
        })
        .returning({ id: moneyTag.id });
      const sourceId =
        typeof raw.sourceId === "string" && UUID_RE.test(raw.sourceId)
          ? raw.sourceId
          : undefined;
      if (sourceId && idMaps && ins) idMaps.tags.set(sourceId, ins.id);
      n++;
    }
    return n;
  }
  return commitMoneyImport(ctx, kind as MoneyImportType, rows, idMaps);
}

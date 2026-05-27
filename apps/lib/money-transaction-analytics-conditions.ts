import { eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { moneyTransaction, moneyTransactionTag } from "@/db/schema/money";
import { analyticsFiltersSchema } from "@/lib/validators/money";
import type { z } from "zod";

export type AnalyticsFiltersData = z.infer<typeof analyticsFiltersSchema>;

export function analyticsFilterFieldsFromUrl(url: URL) {
  const getAll = (key: string) => {
    const values = url.searchParams.getAll(key);
    return values.length > 0 ? values : undefined;
  };
  return {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    accountIds: getAll("accountIds"),
    categoryIds: getAll("categoryIds"),
    merchantIds: getAll("merchantIds"),
    tagIds: getAll("tagIds"),
    kinds: getAll("kinds"),
  };
}

export function analyticsFiltersFromUrl(url: URL) {
  return analyticsFiltersSchema.safeParse(analyticsFilterFieldsFromUrl(url));
}

/** Same defaults as GET /api/money/analytics (missing bounds → 90d–now). */
export function resolveAnalyticsDateBounds(filters: AnalyticsFiltersData): {
  fromISO: string;
  toISO: string;
} {
  const fromISO =
    filters.from ?? new Date(Date.now() - 90 * 86400000).toISOString();
  const toISO = filters.to ?? new Date().toISOString();
  return { fromISO, toISO };
}

export function moneyTransactionConditionsForAnalytics(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): SQL[] {
  const { fromISO, toISO } = resolveAnalyticsDateBounds(filters);
  const conditions: SQL[] = [
    eq(moneyTransaction.workspaceId, workspaceId),
    gte(moneyTransaction.occurredAt, new Date(fromISO)),
    lte(moneyTransaction.occurredAt, new Date(toISO)),
  ];

  if (filters.accountIds && filters.accountIds.length > 0) {
    conditions.push(inArray(moneyTransaction.accountId, filters.accountIds));
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    conditions.push(inArray(moneyTransaction.categoryId, filters.categoryIds));
  }
  if (filters.merchantIds && filters.merchantIds.length > 0) {
    conditions.push(inArray(moneyTransaction.merchantId, filters.merchantIds));
  }
  if (filters.kinds && filters.kinds.length > 0) {
    conditions.push(inArray(moneyTransaction.kind, filters.kinds));
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    const tagIds = filters.tagIds;
    conditions.push(
      sql`${moneyTransaction.id} IN (
        SELECT ${moneyTransactionTag.transactionId}
        FROM ${moneyTransactionTag}
        WHERE ${inArray(moneyTransactionTag.tagId, tagIds)}
        GROUP BY ${moneyTransactionTag.transactionId}
        HAVING count(DISTINCT ${moneyTransactionTag.tagId}) = ${tagIds.length}
      )`,
    );
  }

  return conditions;
}

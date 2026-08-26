import { and, eq, gte, inArray, isNotNull, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyCategory, moneyTransaction, moneyTransactionTag } from "@/db/schema/money";
import { expandCategoryFilterIds } from "@/lib/money-category-ui";
import {
  isCategoryFilterNone,
  splitCategoryFilterIds,
} from "@/lib/analytics-category-filter";
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
    recurrence: url.searchParams.get("recurrence") ?? undefined,
    recurrenceSourceIds: getAll("recurrenceSourceIds"),
    accountTypes: getAll("accountTypes"),
    excludeAccountTypes: getAll("excludeAccountTypes"),
  };
}

export function analyticsFiltersFromUrl(url: URL) {
  return analyticsFiltersSchema.safeParse(analyticsFilterFieldsFromUrl(url));
}

/** Same defaults as GET /api/money/analytics (missing bounds → 90d–now). Caps to 366d. */
export function resolveAnalyticsDateBounds(filters: AnalyticsFiltersData): {
  fromISO: string;
  toISO: string;
} {
  const toISO = filters.to ?? new Date().toISOString();
  let fromISO =
    filters.from ?? new Date(Date.now() - 90 * 86400000).toISOString();
  const toMs = Date.parse(toISO);
  const fromMs = Date.parse(fromISO);
  const maxMs = 366 * 86400000;
  if (
    Number.isFinite(fromMs) &&
    Number.isFinite(toMs) &&
    toMs - fromMs > maxMs
  ) {
    fromISO = new Date(toMs - maxMs).toISOString();
  }
  return { fromISO, toISO };
}

/** True when parent category ids must be expanded before building SQL. */
export function analyticsFiltersNeedCategoryExpansion(
  filters: AnalyticsFiltersData,
): boolean {
  if (!filters.categoryIds?.length) return false;
  return splitCategoryFilterIds(filters.categoryIds).categoryUuids.length > 0;
}

/** Expands parent category filters to include descendant categories before querying. */
export async function resolveAnalyticsFiltersForQuery(
  workspaceId: string,
  filters: AnalyticsFiltersData,
  categoryRows?: ReadonlyArray<{ id: string; parentId: string | null }>,
): Promise<AnalyticsFiltersData> {
  if (!filters.categoryIds?.length) return filters;
  const { includeUncategorized, categoryUuids } = splitCategoryFilterIds(
    filters.categoryIds,
  );
  if (categoryUuids.length === 0) return filters;
  const rows =
    categoryRows ??
    (await db
      .select({ id: moneyCategory.id, parentId: moneyCategory.parentId })
      .from(moneyCategory)
      .where(eq(moneyCategory.workspaceId, workspaceId)));
  const expanded = expandCategoryFilterIds(categoryUuids, rows);
  const categoryIds = includeUncategorized
    ? [...expanded, ...filters.categoryIds.filter(isCategoryFilterNone)]
    : expanded;
  return { ...filters, categoryIds };
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
  if (filters.accountTypes && filters.accountTypes.length > 0) {
    conditions.push(
      inArray(
        moneyTransaction.accountId,
        db
          .select({ id: moneyAccount.id })
          .from(moneyAccount)
          .where(
            and(
              eq(moneyAccount.workspaceId, workspaceId),
              inArray(moneyAccount.type, filters.accountTypes),
            ),
          ),
      ),
    );
  }
  if (filters.excludeAccountTypes && filters.excludeAccountTypes.length > 0) {
    conditions.push(
      notInArray(
        moneyTransaction.accountId,
        db
          .select({ id: moneyAccount.id })
          .from(moneyAccount)
          .where(
            and(
              eq(moneyAccount.workspaceId, workspaceId),
              inArray(moneyAccount.type, filters.excludeAccountTypes),
            ),
          ),
      ),
    );
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const { includeUncategorized, categoryUuids } = splitCategoryFilterIds(
      filters.categoryIds,
    );
    if (includeUncategorized && categoryUuids.length > 0) {
      conditions.push(
        or(
          isNull(moneyTransaction.categoryId),
          inArray(moneyTransaction.categoryId, categoryUuids),
        )!,
      );
    } else if (includeUncategorized) {
      conditions.push(isNull(moneyTransaction.categoryId));
    } else if (categoryUuids.length > 0) {
      conditions.push(inArray(moneyTransaction.categoryId, categoryUuids));
    }
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
        WITH matched_transactions AS (
          SELECT ${moneyTransactionTag.transactionId} AS transaction_id
          FROM ${moneyTransactionTag}
          WHERE ${inArray(moneyTransactionTag.tagId, tagIds)}
          GROUP BY ${moneyTransactionTag.transactionId}
          HAVING count(DISTINCT ${moneyTransactionTag.tagId}) = ${tagIds.length}
        )
        SELECT transaction_id FROM matched_transactions
      )`,
    );
  }
  if (filters.recurrenceSourceIds && filters.recurrenceSourceIds.length > 0) {
    conditions.push(
      inArray(moneyTransaction.recurrenceSourceId, filters.recurrenceSourceIds),
    );
  } else if (filters.recurrence === "recurring") {
    conditions.push(isNotNull(moneyTransaction.recurrenceSourceId));
  } else if (filters.recurrence === "one-time") {
    conditions.push(isNull(moneyTransaction.recurrenceSourceId));
  }

  return conditions;
}

/** Transactions with this flag set are omitted from analytics charts and budget spend. */
export function moneyTransactionIncludedInReportsCondition(): SQL {
  return eq(moneyTransaction.excludeFromAnalyticsAndBudget, false);
}

/** Analytics filters plus exclusion of transactions marked out of reports. */
export function moneyTransactionConditionsForReports(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): SQL[] {
  return [
    ...moneyTransactionConditionsForAnalytics(workspaceId, filters),
    moneyTransactionIncludedInReportsCondition(),
  ];
}

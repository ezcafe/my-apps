import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyBudget,
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyRule,
  moneyTag,
} from "@/db/schema/money";
import type { RuleAction, RuleMatch } from "@/lib/rules";
import { recurrentTemplateBodySchema } from "@/lib/validators/money";

/**
 * Copy Money metadata from source workspace into target (no transactions).
 * Caller must enforce authorization (member of source, owner of target).
 */
export async function cloneMoneyWorkspaceStructure(
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const categoryMap = new Map<string, string>();
    const sourceCategories = await tx
      .select()
      .from(moneyCategory)
      .where(eq(moneyCategory.workspaceId, sourceWorkspaceId));

    const pending = new Map(sourceCategories.map((c) => [c.id, c]));
    let guard = 0;
    while (pending.size > 0) {
      if (guard++ > 5000) {
        throw new Error("Category clone failed (cycle or orphan parents)");
      }
      const batch = [...pending.values()].filter(
        (c) => c.parentId === null || categoryMap.has(c.parentId),
      );
      if (batch.length === 0) {
        throw new Error("Category clone failed (cycle or orphan parents)");
      }
      const inserted = await tx
        .insert(moneyCategory)
        .values(
          batch.map((c) => ({
            workspaceId: targetWorkspaceId,
            name: c.name,
            kind: c.kind,
            parentId: c.parentId ? categoryMap.get(c.parentId) ?? null : null,
            archived: c.archived,
          })),
        )
        .returning({ id: moneyCategory.id });
      for (let i = 0; i < batch.length; i++) {
        categoryMap.set(batch[i]!.id, inserted[i]!.id);
        pending.delete(batch[i]!.id);
      }
    }

    const accountMap = new Map<string, string>();
    const sourceAccounts = await tx
      .select()
      .from(moneyAccount)
      .where(eq(moneyAccount.workspaceId, sourceWorkspaceId));
    if (sourceAccounts.length > 0) {
      const insertedAccounts = await tx
        .insert(moneyAccount)
        .values(
          sourceAccounts.map((a) => ({
            workspaceId: targetWorkspaceId,
            name: a.name,
            type: a.type,
            currency: a.currency,
            institution: a.institution,
            balanceMinor: a.balanceMinor,
            sortOrder: a.sortOrder,
            archived: a.archived,
          })),
        )
        .returning({ id: moneyAccount.id });
      for (let i = 0; i < sourceAccounts.length; i++) {
        accountMap.set(sourceAccounts[i]!.id, insertedAccounts[i]!.id);
      }
    }

    const merchantMap = new Map<string, string>();
    const sourceMerchants = await tx
      .select()
      .from(moneyMerchant)
      .where(eq(moneyMerchant.workspaceId, sourceWorkspaceId));
    if (sourceMerchants.length > 0) {
      const insertedMerchants = await tx
        .insert(moneyMerchant)
        .values(
          sourceMerchants.map((m) => ({
            workspaceId: targetWorkspaceId,
            name: m.name,
            normalizedName: m.normalizedName,
          })),
        )
        .returning({ id: moneyMerchant.id });
      for (let i = 0; i < sourceMerchants.length; i++) {
        merchantMap.set(sourceMerchants[i]!.id, insertedMerchants[i]!.id);
      }
    }

    const tagMap = new Map<string, string>();
    const sourceTags = await tx
      .select()
      .from(moneyTag)
      .where(eq(moneyTag.workspaceId, sourceWorkspaceId));
    if (sourceTags.length > 0) {
      const tagNames = sourceTags.map((t) => t.name);
      const existingTags = await tx
        .select({ id: moneyTag.id, name: moneyTag.name })
        .from(moneyTag)
        .where(
          and(
            eq(moneyTag.workspaceId, targetWorkspaceId),
            inArray(moneyTag.name, tagNames),
          ),
        );
      const existingByName = new Map(existingTags.map((e) => [e.name, e.id]));
      const toInsert: typeof sourceTags = [];
      for (const t of sourceTags) {
        const existId = existingByName.get(t.name);
        if (existId) {
          tagMap.set(t.id, existId);
        } else {
          toInsert.push(t);
        }
      }
      if (toInsert.length > 0) {
        const insertedTags = await tx
          .insert(moneyTag)
          .values(
            toInsert.map((t) => ({
              workspaceId: targetWorkspaceId,
              name: t.name,
              color: t.color,
            })),
          )
          .returning({ id: moneyTag.id });
        for (let i = 0; i < toInsert.length; i++) {
          tagMap.set(toInsert[i]!.id, insertedTags[i]!.id);
        }
      }
    }

    const sourceRules = await tx
      .select()
      .from(moneyRule)
      .where(eq(moneyRule.workspaceId, sourceWorkspaceId));

    const rulesToInsert: Array<typeof moneyRule.$inferInsert> = [];
    for (const r of sourceRules) {
      const match = r.match as RuleMatch;
      const action = r.action as RuleAction;

      const nextMatch: RuleMatch = {};
      if (match.accountId) {
        const mapped = accountMap.get(match.accountId);
        if (!mapped) continue;
        nextMatch.accountId = mapped;
      }
      if (match.merchantId) {
        const mapped = merchantMap.get(match.merchantId);
        if (!mapped) continue;
        nextMatch.merchantId = mapped;
      }

      if (!nextMatch.accountId && !nextMatch.merchantId) continue;

      const nextAction: RuleAction = {};
      if (action.setCategoryId) {
        const mapped = categoryMap.get(action.setCategoryId);
        if (!mapped) continue;
        nextAction.setCategoryId = mapped;
      }
      if (action.tagIds?.length) {
        const remapped = action.tagIds
          .map((id) => tagMap.get(id))
          .filter((id): id is string => Boolean(id));
        if (remapped.length) nextAction.tagIds = remapped;
      }

      rulesToInsert.push({
        workspaceId: targetWorkspaceId,
        name: r.name,
        kind: r.kind,
        priority: r.priority,
        match: nextMatch,
        action: nextAction,
        active: r.active,
      });
    }
    if (rulesToInsert.length > 0) {
      await tx.insert(moneyRule).values(rulesToInsert);
    }

    const sourceRec = await tx
      .select()
      .from(moneyRecurrentTemplate)
      .where(eq(moneyRecurrentTemplate.workspaceId, sourceWorkspaceId));

    const recToInsert: Array<typeof moneyRecurrentTemplate.$inferInsert> = [];
    for (const tpl of sourceRec) {
      const parsed = recurrentTemplateBodySchema.safeParse(tpl.template);
      if (!parsed.success) continue;

      const t = parsed.data;
      const nextAccountId = accountMap.get(t.accountId);
      if (!nextAccountId) continue;

      let nextCategoryId: string | null | undefined = t.categoryId;
      if (t.categoryId) {
        const m = categoryMap.get(t.categoryId);
        if (!m) continue;
        nextCategoryId = m;
      }

      let nextMerchantId: string | null | undefined = t.merchantId;
      if (t.merchantId) {
        const m = merchantMap.get(t.merchantId);
        if (!m) continue;
        nextMerchantId = m;
      }

      const nextTagIds = (t.tagIds ?? [])
        .map((id) => tagMap.get(id))
        .filter((id): id is string => Boolean(id));

      recToInsert.push({
        workspaceId: targetWorkspaceId,
        name: tpl.name,
        cadence: tpl.cadence,
        nextRunAt: tpl.nextRunAt,
        template: {
          accountId: nextAccountId,
          kind: t.kind,
          amountMinor: t.amountMinor,
          categoryId: nextCategoryId ?? null,
          merchantId: nextMerchantId ?? null,
          notes: t.notes ?? null,
          tagIds: nextTagIds.length ? nextTagIds : undefined,
        },
        active: tpl.active,
      });
    }
    if (recToInsert.length > 0) {
      await tx.insert(moneyRecurrentTemplate).values(recToInsert);
    }

    const sourceBudgets = await tx
      .select()
      .from(moneyBudget)
      .where(eq(moneyBudget.workspaceId, sourceWorkspaceId));

    const budgetsToInsert: Array<typeof moneyBudget.$inferInsert> = [];
    for (const b of sourceBudgets) {
      let nextScopeId: string | null = null;
      if (b.scopeType === "workspace") {
        nextScopeId = null;
      } else if (b.scopeType === "category" && b.scopeId) {
        const m = categoryMap.get(b.scopeId);
        if (!m) continue;
        nextScopeId = m;
      } else if (b.scopeType === "account" && b.scopeId) {
        const m = accountMap.get(b.scopeId);
        if (!m) continue;
        nextScopeId = m;
      } else if (b.scopeType === "tag" && b.scopeId) {
        const m = tagMap.get(b.scopeId);
        if (!m) continue;
        nextScopeId = m;
      }

      budgetsToInsert.push({
        workspaceId: targetWorkspaceId,
        scopeType: b.scopeType,
        scopeId: nextScopeId,
        limitAmountMinor: b.limitAmountMinor,
        currency: b.currency,
      });
    }
    if (budgetsToInsert.length > 0) {
      await tx.insert(moneyBudget).values(budgetsToInsert);
    }
  });
}

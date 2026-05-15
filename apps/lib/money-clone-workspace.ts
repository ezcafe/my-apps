import { and, eq } from "drizzle-orm";
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
      for (const c of batch) {
        const [ins] = await tx
          .insert(moneyCategory)
          .values({
            workspaceId: targetWorkspaceId,
            name: c.name,
            kind: c.kind,
            parentId: c.parentId ? categoryMap.get(c.parentId) ?? null : null,
            archived: c.archived,
          })
          .returning({ id: moneyCategory.id });
        categoryMap.set(c.id, ins.id);
        pending.delete(c.id);
      }
    }

    const accountMap = new Map<string, string>();
    const sourceAccounts = await tx
      .select()
      .from(moneyAccount)
      .where(eq(moneyAccount.workspaceId, sourceWorkspaceId));
    for (const a of sourceAccounts) {
      const [ins] = await tx
        .insert(moneyAccount)
        .values({
          workspaceId: targetWorkspaceId,
          name: a.name,
          type: a.type,
          currency: a.currency,
          institution: a.institution,
          balanceMinor: a.balanceMinor,
          sortOrder: a.sortOrder,
          archived: a.archived,
        })
        .returning({ id: moneyAccount.id });
      accountMap.set(a.id, ins.id);
    }

    const merchantMap = new Map<string, string>();
    const sourceMerchants = await tx
      .select()
      .from(moneyMerchant)
      .where(eq(moneyMerchant.workspaceId, sourceWorkspaceId));
    for (const m of sourceMerchants) {
      const [ins] = await tx
        .insert(moneyMerchant)
        .values({
          workspaceId: targetWorkspaceId,
          name: m.name,
          normalizedName: m.normalizedName,
        })
        .returning({ id: moneyMerchant.id });
      merchantMap.set(m.id, ins.id);
    }

    const tagMap = new Map<string, string>();
    const sourceTags = await tx
      .select()
      .from(moneyTag)
      .where(eq(moneyTag.workspaceId, sourceWorkspaceId));
    for (const t of sourceTags) {
      const [existing] = await tx
        .select({ id: moneyTag.id })
        .from(moneyTag)
        .where(
          and(
            eq(moneyTag.workspaceId, targetWorkspaceId),
            eq(moneyTag.name, t.name),
          ),
        )
        .limit(1);
      if (existing) {
        tagMap.set(t.id, existing.id);
      } else {
        const [ins] = await tx
          .insert(moneyTag)
          .values({
            workspaceId: targetWorkspaceId,
            name: t.name,
            color: t.color,
          })
          .returning({ id: moneyTag.id });
        tagMap.set(t.id, ins.id);
      }
    }

    const sourceRules = await tx
      .select()
      .from(moneyRule)
      .where(eq(moneyRule.workspaceId, sourceWorkspaceId));

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

      await tx.insert(moneyRule).values({
        workspaceId: targetWorkspaceId,
        name: r.name,
        kind: r.kind,
        priority: r.priority,
        match: nextMatch,
        action: nextAction,
        active: r.active,
      });
    }

    const sourceRec = await tx
      .select()
      .from(moneyRecurrentTemplate)
      .where(eq(moneyRecurrentTemplate.workspaceId, sourceWorkspaceId));

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

      await tx.insert(moneyRecurrentTemplate).values({
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

    const sourceBudgets = await tx
      .select()
      .from(moneyBudget)
      .where(eq(moneyBudget.workspaceId, sourceWorkspaceId));

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

      await tx.insert(moneyBudget).values({
        workspaceId: targetWorkspaceId,
        scopeType: b.scopeType,
        scopeId: nextScopeId,
        limitAmountMinor: b.limitAmountMinor,
        currency: b.currency,
      });
    }
  });
}

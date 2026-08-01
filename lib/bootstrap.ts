import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
} from "@/db/schema/workspace";

import {
  ensureDefaultSystemAccounts,
  MONEY_SEED_BILLS,
  MONEY_SEED_FINANCIAL_FREEDOM,
  MONEY_SEED_LOANS,
  MONEY_SEED_NECESSITIES,
} from "@/lib/money-seed-defaults";

export async function seedMoneyWorkspaceDefaults(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
) {
  await ensureDefaultSystemAccounts(tx, workspaceId, "USD");

  const [necessities] = await tx
    .insert(moneyCategory)
    .values({ workspaceId, name: MONEY_SEED_NECESSITIES, kind: "expense" })
    .returning({ id: moneyCategory.id });
  const [give] = await tx
    .insert(moneyCategory)
    .values({ workspaceId, name: "Give", kind: "expense" })
    .returning({ id: moneyCategory.id });
  const [income] = await tx
    .insert(moneyCategory)
    .values({ workspaceId, name: "Income", kind: "income" })
    .returning({ id: moneyCategory.id });

  await tx.insert(moneyCategory).values([
    { workspaceId, name: MONEY_SEED_FINANCIAL_FREEDOM, kind: "expense" },
    { workspaceId, name: "Long-term Savings", kind: "expense" },
    { workspaceId, name: "Education", kind: "expense" },
    { workspaceId, name: "Play", kind: "expense" },
    {
      workspaceId,
      name: "Food & Drink",
      kind: "expense",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: "Transportation",
      kind: "expense",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: MONEY_SEED_BILLS,
      kind: "expense",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: MONEY_SEED_LOANS,
      kind: "expense",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: "Gifts & Donations",
      kind: "expense",
      parentId: give.id,
    },
    {
      workspaceId,
      name: "Salary",
      kind: "income",
      parentId: income.id,
    },
    {
      workspaceId,
      name: "Bonus",
      kind: "income",
      parentId: income.id,
    },
    {
      workspaceId,
      name: "Investment",
      kind: "income",
      parentId: income.id,
    },
    {
      workspaceId,
      name: "Other",
      kind: "income",
      parentId: income.id,
    },
  ]);
}

export async function ensureUserBootstrap(userSub: string) {
  const existing = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(eq(workspaceMember.userSub, userSub))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    const [insertedWs] = await tx
      .insert(workspace)
      .values({
        name: "Personal",
        kind: "personal",
        ownedByUserSub: userSub,
        defaultCurrency: null,
      })
      .onConflictDoNothing()
      .returning();

    const ws =
      insertedWs ??
      (
        await tx
          .select({ id: workspace.id })
          .from(workspace)
          .where(eq(workspace.ownedByUserSub, userSub))
          .limit(1)
      )[0];
    if (!ws) {
      throw new Error("Failed to resolve personal workspace during bootstrap");
    }

    await tx.insert(workspaceMember).values({
      workspaceId: ws.id,
      userSub,
      role: "owner",
    }).onConflictDoNothing();

    await tx.insert(userWorkspaceDefault).values([
      {
        userSub,
        appKey: "money",
        defaultWorkspaceId: ws.id,
      },
    ]).onConflictDoUpdate({
      target: [userWorkspaceDefault.userSub, userWorkspaceDefault.appKey],
      set: { defaultWorkspaceId: ws.id },
    });

    if (insertedWs) {
      await seedMoneyWorkspaceDefaults(tx, ws.id);
    }
  });
}

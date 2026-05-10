import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyCategory } from "@/db/schema/money";
import {
  userWorkspaceDefault,
  workspace,
  workspaceMember,
} from "@/db/schema/workspace";

export async function seedMoneyWorkspaceDefaults(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
) {
  await tx.insert(moneyAccount).values({
    workspaceId,
    name: "Credit Card",
    type: "credit",
    currency: "USD",
    sortOrder: 0,
  });

  const [necessities] = await tx
    .insert(moneyCategory)
    .values({ workspaceId, name: "Necessities" })
    .returning({ id: moneyCategory.id });
  const [give] = await tx
    .insert(moneyCategory)
    .values({ workspaceId, name: "Give" })
    .returning({ id: moneyCategory.id });

  await tx.insert(moneyCategory).values([
    { workspaceId, name: "Financial Freedom" },
    { workspaceId, name: "Long-term Savings" },
    { workspaceId, name: "Education" },
    { workspaceId, name: "Play" },
    {
      workspaceId,
      name: "Food & Drink",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: "Transportation",
      parentId: necessities.id,
    },
    {
      workspaceId,
      name: "Gifts & Donations",
      parentId: give.id,
    },
  ]);
}

export async function ensureUserBootstrap(userSub: string) {
  const existing = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(eq(workspaceMember.userSub, userSub))
    .limit(1);

  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspace)
      .values({
        name: "Personal",
        kind: "personal",
        ownedByUserSub: userSub,
        defaultCurrency: null,
      })
      .returning();

    await tx.insert(workspaceMember).values({
      workspaceId: ws.id,
      userSub,
      role: "owner",
    });

    await tx.insert(userWorkspaceDefault).values({
      userSub,
      appKey: "money",
      defaultWorkspaceId: ws.id,
    });

    await seedMoneyWorkspaceDefaults(tx, ws.id);
  });
}

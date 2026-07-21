import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsAccount } from "@/db/schema/savings";
import type {
  savingsAccountCreateSchema,
  savingsAccountUpdateSchema,
} from "@/lib/validators/savings";
import type { z } from "zod";

export async function countSavingsAccounts(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(savingsAccount)
    .where(
      and(
        eq(savingsAccount.workspaceId, workspaceId),
        eq(savingsAccount.archived, 0),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function listSavingsAccounts(workspaceId: string) {
  return db
    .select()
    .from(savingsAccount)
    .where(eq(savingsAccount.workspaceId, workspaceId))
    .orderBy(asc(savingsAccount.sortOrder), asc(savingsAccount.name));
}

export async function createSavingsAccount(
  workspaceId: string,
  input: z.infer<typeof savingsAccountCreateSchema>,
) {
  const [row] = await db
    .insert(savingsAccount)
    .values({
      workspaceId,
      name: input.name,
      currency: input.currency ?? "USD",
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row!;
}

export async function updateSavingsAccount(
  workspaceId: string,
  id: string,
  input: z.infer<typeof savingsAccountUpdateSchema>,
) {
  const [row] = await db
    .update(savingsAccount)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.archived !== undefined
        ? { archived: input.archived ? 1 : 0 }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(savingsAccount.id, id), eq(savingsAccount.workspaceId, workspaceId)),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function getSavingsAccount(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(savingsAccount)
    .where(
      and(eq(savingsAccount.id, id), eq(savingsAccount.workspaceId, workspaceId)),
    )
    .limit(1);
  return row ?? null;
}

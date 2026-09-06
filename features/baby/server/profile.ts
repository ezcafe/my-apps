import { eq } from "drizzle-orm";
import { db } from "@/db";
import { babyProfile } from "@/db/schema/baby";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { babyDisplayNameSchema } from "@/lib/validators/baby";

export type BabyProfileRow = {
  id: string;
  workspaceId: string;
  displayName: string;
  birthDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Pure ensure algorithm — unit-test without DATABASE_URL. */
export async function resolveEnsuredRow<T>(ops: {
  findExisting: () => Promise<T | null | undefined>;
  tryInsert: () => Promise<T | null | undefined>;
  findAgain: () => Promise<T | null | undefined>;
  missingError?: string;
}): Promise<T> {
  const existing = await ops.findExisting();
  if (existing) return existing;

  const inserted = await ops.tryInsert();
  if (inserted) return inserted;

  const again = await ops.findAgain();
  if (!again) {
    throw new Error(ops.missingError ?? "Failed to ensure baby profile");
  }
  return again;
}

/** Ensure exactly one baby profile for the workspace (idempotent). */
export async function ensureBabyProfile(
  workspaceId: string,
  displayName = "Baby",
): Promise<BabyProfileRow> {
  const name = parseOrThrow(babyDisplayNameSchema, displayName);
  return resolveEnsuredRow({
    findExisting: async () => {
      const rows = await db
        .select()
        .from(babyProfile)
        .where(eq(babyProfile.workspaceId, workspaceId))
        .limit(1);
      return rows[0];
    },
    tryInsert: async () => {
      const [inserted] = await db
        .insert(babyProfile)
        .values({
          workspaceId,
          displayName: name,
        })
        .onConflictDoNothing({ target: babyProfile.workspaceId })
        .returning();
      return inserted;
    },
    findAgain: async () => {
      const rows = await db
        .select()
        .from(babyProfile)
        .where(eq(babyProfile.workspaceId, workspaceId))
        .limit(1);
      return rows[0];
    },
  });
}

export async function getBabyProfile(
  workspaceId: string,
): Promise<BabyProfileRow | null> {
  const rows = await db
    .select()
    .from(babyProfile)
    .where(eq(babyProfile.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

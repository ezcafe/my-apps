import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { loanPushSubscription } from "@/db/schema/loans";
import {
  loanPushSubscriptionDeleteSchema,
  loanPushSubscriptionSaveSchema,
} from "@/lib/validators/loans";

export async function saveLoanPushSubscription(
  userSub: string,
  body: unknown,
): Promise<{ ok: true }> {
  const parsed = loanPushSubscriptionSaveSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  await db
    .insert(loanPushSubscription)
    .values({
      userSub,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    })
    .onConflictDoUpdate({
      target: [loanPushSubscription.userSub, loanPushSubscription.endpoint],
      set: {
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
    });

  return { ok: true };
}

export async function deleteLoanPushSubscription(
  userSub: string,
  body: unknown,
): Promise<{ ok: true }> {
  const parsed = loanPushSubscriptionDeleteSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  await db
    .delete(loanPushSubscription)
    .where(
      and(
        eq(loanPushSubscription.userSub, userSub),
        eq(loanPushSubscription.endpoint, parsed.data.endpoint),
      ),
    );

  return { ok: true };
}

export async function listPushSubscriptionsForUser(userSub: string) {
  return db
    .select()
    .from(loanPushSubscription)
    .where(eq(loanPushSubscription.userSub, userSub));
}

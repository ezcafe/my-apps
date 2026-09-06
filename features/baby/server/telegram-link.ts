import { and, eq, isNull } from "drizzle-orm";
import { db, withBypassRls } from "@/db";
import { babyTelegramLink } from "@/db/schema/baby";
import { isTelegramEnabled } from "@/lib/telegram/config";
import { linkBabyTelegramSchema } from "@/lib/validators/baby";

export type BabyTelegramLinkRow = {
  workspaceId: string;
  chatId: string;
  linkedAt: Date;
  linkedByUserSub: string;
  confirmedAt: Date | null;
};

export type TelegramLinkDeps = {
  getExisting: (workspaceId: string) => Promise<BabyTelegramLinkRow | null>;
  update: (
    workspaceId: string,
    values: {
      chatId: string;
      linkedAt: Date;
      linkedByUserSub: string;
      confirmedAt: Date | null;
    },
  ) => Promise<BabyTelegramLinkRow>;
  insert: (values: {
    workspaceId: string;
    chatId: string;
    linkedByUserSub: string;
    confirmedAt?: Date | null;
  }) => Promise<BabyTelegramLinkRow>;
  delete: (workspaceId: string) => Promise<BabyTelegramLinkRow | null>;
  confirmByChatId: (chatId: string) => Promise<BabyTelegramLinkRow | null>;
  isTelegramEnabled: () => boolean;
};

async function defaultGetExisting(
  workspaceId: string,
): Promise<BabyTelegramLinkRow | null> {
  const rows = await db
    .select()
    .from(babyTelegramLink)
    .where(eq(babyTelegramLink.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

async function defaultConfirmByChatId(
  chatId: string,
): Promise<BabyTelegramLinkRow | null> {
  // Chat-id lookup/update has no workspace RLS GUC yet — bypass like find-by-chat.
  return withBypassRls(async () => {
    const [row] = await db
      .update(babyTelegramLink)
      .set({ confirmedAt: new Date() })
      .where(
        and(
          eq(babyTelegramLink.chatId, chatId),
          isNull(babyTelegramLink.confirmedAt),
        ),
      )
      .returning();
    if (row) return row;

    const existing = await db
      .select()
      .from(babyTelegramLink)
      .where(eq(babyTelegramLink.chatId, chatId))
      .limit(1);
    return existing[0] ?? null;
  });
}

function defaultTelegramLinkDeps(): TelegramLinkDeps {
  return {
    getExisting: defaultGetExisting,
    update: async (workspaceId, values) => {
      const [row] = await db
        .update(babyTelegramLink)
        .set(values)
        .where(eq(babyTelegramLink.workspaceId, workspaceId))
        .returning();
      return row;
    },
    insert: async (values) => {
      const [row] = await db
        .insert(babyTelegramLink)
        .values({
          workspaceId: values.workspaceId,
          chatId: values.chatId,
          linkedByUserSub: values.linkedByUserSub,
          confirmedAt: values.confirmedAt ?? null,
        })
        .returning();
      return row;
    },
    delete: async (workspaceId) => {
      const [row] = await db
        .delete(babyTelegramLink)
        .where(eq(babyTelegramLink.workspaceId, workspaceId))
        .returning();
      return row ?? null;
    },
    confirmByChatId: defaultConfirmByChatId,
    isTelegramEnabled: () => isTelegramEnabled(),
  };
}

export async function getBabyTelegramLink(workspaceId: string) {
  return defaultGetExisting(workspaceId);
}

/** Model B: store chat as pending until webhook sees a message from that chat. */
export async function linkBabyTelegramChat(
  workspaceId: string,
  userSub: string,
  raw: unknown,
  deps: TelegramLinkDeps = defaultTelegramLinkDeps(),
) {
  if (!deps.isTelegramEnabled()) {
    throw new Error("TELEGRAM_DISABLED");
  }
  const input = linkBabyTelegramSchema.parse(raw);
  const existing = await deps.getExisting(workspaceId);
  if (existing) {
    return deps.update(workspaceId, {
      chatId: input.chatId,
      linkedAt: new Date(),
      linkedByUserSub: userSub,
      confirmedAt: null,
    });
  }
  return deps.insert({
    workspaceId,
    chatId: input.chatId,
    linkedByUserSub: userSub,
    confirmedAt: null,
  });
}

/** Confirm ownership when Telegram delivers a message from the linked chatId. */
export async function confirmBabyTelegramChatByMessage(
  chatId: string,
  deps: Pick<TelegramLinkDeps, "confirmByChatId"> = defaultTelegramLinkDeps(),
) {
  return deps.confirmByChatId(chatId);
}

export async function unlinkBabyTelegramChat(
  workspaceId: string,
  deps: Pick<TelegramLinkDeps, "delete"> = defaultTelegramLinkDeps(),
) {
  return deps.delete(workspaceId);
}

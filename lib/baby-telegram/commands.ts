import { eq } from "drizzle-orm";
import { db, runInWorkspace, withBypassRls } from "@/db";
import { babyTelegramLink } from "@/db/schema/baby";
import {
  createBabyDiaper,
  createBabyFeed,
  endBabySleep,
  startBabySleep,
} from "@/features/baby/server/care-events";
import { createBabyGrowth } from "@/features/baby/server/growth";
import { confirmBabyTelegramChatByMessage } from "@/features/baby/server/telegram-link";
import { sendTelegramMessage } from "@/lib/telegram/send";

export type ParsedBabyCommand =
  | { kind: "feed"; method: "breast_l" | "breast_r" | "formula" | "pump" }
  | { kind: "diaper"; diaperKind: "wet" | "dirty" | "mixed" }
  | { kind: "sleep_start" }
  | { kind: "sleep_end" }
  | { kind: "health"; text: string }
  | { kind: "unknown" };

/** Simple MVP grammar: /feed left|right|formula|pump, /diaper wet|dirty|mixed, /sleep start|end, /health … */
export function parseBabyTelegramCommand(text: string): ParsedBabyCommand {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const feed = /^\/feed\s+(left|l|right|r|formula|pump)\b/.exec(lower);
  if (feed) {
    const m = feed[1];
    const method =
      m === "left" || m === "l"
        ? "breast_l"
        : m === "right" || m === "r"
          ? "breast_r"
          : m === "formula"
            ? "formula"
            : "pump";
    return { kind: "feed", method };
  }

  const diaper = /^\/diaper\s+(wet|dirty|mixed)\b/.exec(lower);
  if (diaper) {
    return {
      kind: "diaper",
      diaperKind: diaper[1] as "wet" | "dirty" | "mixed",
    };
  }

  if (/^\/sleep\s+start\b/.test(lower)) return { kind: "sleep_start" };
  if (/^\/sleep\s+end\b/.test(lower)) return { kind: "sleep_end" };

  const health = /^\/health\s+(.+)/i.exec(trimmed);
  if (health) return { kind: "health", text: health[1].trim() };

  return { kind: "unknown" };
}

export type BabyTelegramLinkLookup = {
  workspaceId: string;
  chatId: string;
  linkedByUserSub: string;
  confirmedAt: Date | null;
};

async function defaultFindLinkByChatId(
  chatId: string,
): Promise<BabyTelegramLinkLookup | null> {
  return withBypassRls(async () => {
    const rows = await db
      .select()
      .from(babyTelegramLink)
      .where(eq(babyTelegramLink.chatId, chatId))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function handleBabyTelegramCommand(
  input: {
    chatId: string;
    text: string;
  },
  deps: {
    findLinkByChatId?: (
      chatId: string,
    ) => Promise<BabyTelegramLinkLookup | null>;
    confirmByChatId?: (
      chatId: string,
    ) => Promise<BabyTelegramLinkLookup | null>;
  } = {},
): Promise<{ handled: boolean; summary?: string }> {
  const findLink = deps.findLinkByChatId ?? defaultFindLinkByChatId;
  const confirm =
    deps.confirmByChatId ??
    ((chatId: string) => confirmBabyTelegramChatByMessage(chatId));
  let link = await findLink(input.chatId);

  if (!link) return { handled: false };

  if (!link.confirmedAt) {
    const confirmed = await confirm(input.chatId);
    if (confirmed) link = confirmed;
  }

  // Explicit gate: never fall through to care writes while still pending.
  if (!link.confirmedAt) {
    return { handled: false };
  }

  const cmd = parseBabyTelegramCommand(input.text);
  if (cmd.kind === "unknown") return { handled: false };

  const userSub = link.linkedByUserSub;
  const workspaceId = link.workspaceId;
  let summary = "";

  await runInWorkspace(workspaceId, async () => {
    if (cmd.kind === "feed") {
      await createBabyFeed(workspaceId, userSub, {
        method: cmd.method,
        source: "telegram",
      });
      summary = `Feed (${cmd.method})`;
    } else if (cmd.kind === "diaper") {
      await createBabyDiaper(workspaceId, userSub, {
        kind: cmd.diaperKind,
        source: "telegram",
      });
      summary = `Diaper (${cmd.diaperKind})`;
    } else if (cmd.kind === "sleep_start") {
      await startBabySleep(workspaceId, userSub, { source: "telegram" });
      summary = "Sleep started";
    } else if (cmd.kind === "sleep_end") {
      await endBabySleep(workspaceId, userSub, { source: "telegram" });
      summary = "Sleep ended";
    } else if (cmd.kind === "health") {
      await createBabyGrowth(workspaceId, userSub, {
        kind: "medication",
        valueText: cmd.text,
        source: "telegram",
      });
      summary = `Health: ${cmd.text}`;
    }
  });

  await sendTelegramMessage(input.chatId, `✓ ${summary}`);
  return { handled: true, summary };
}

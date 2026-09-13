import { runInWorkspace } from "@/db";
import { getBabyTelegramLink } from "@/features/baby/server/telegram-link";
import { isTelegramEnabled } from "@/lib/telegram/config";
import {
  sendTelegramMessage,
  type TelegramSendResult,
} from "@/lib/telegram/send";

export type NotifyBabyCareDeps = {
  isTelegramEnabled: () => boolean;
  getLink: (
    workspaceId: string,
  ) => Promise<{ chatId: string; confirmedAt: Date | null } | null>;
  send: (
    chatId: string,
    text: string,
  ) => Promise<TelegramSendResult>;
};

function defaultNotifyDeps(): NotifyBabyCareDeps {
  return {
    isTelegramEnabled: () => isTelegramEnabled(),
    getLink: (workspaceId) =>
      runInWorkspace(workspaceId, () => getBabyTelegramLink(workspaceId)),
    send: (chatId, text) => sendTelegramMessage(chatId, text),
  };
}

export async function maybeNotifyBabyCareCreated(
  input: {
    workspaceId: string;
    kind: "feed" | "diaper" | "sleep" | "growth";
    summary: string;
    source: "web" | "telegram";
  },
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): Promise<void> {
  if (!deps.isTelegramEnabled()) return;
  const link = await deps.getLink(input.workspaceId);
  if (!link?.confirmedAt) return;
  await deps.send(link.chatId, input.summary);
}

/**
 * Fire-and-forget notify so GraphQL mutations return after DB commit,
 * without waiting on Telegram network RTT.
 * sendTelegramMessage applies AbortSignal timeout so hung fetches cannot pile up.
 */
export function scheduleNotifyBabyCareCreated(
  input: {
    workspaceId: string;
    kind: "feed" | "diaper" | "sleep" | "growth";
    summary: string;
    source: "web" | "telegram";
  },
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): void {
  void maybeNotifyBabyCareCreated(input, deps).catch((err) => {
    console.error("[baby] telegram notify failed", err);
  });
}

export type NotifyBabyCareInput = {
  workspaceId: string;
  kind: "feed" | "diaper" | "sleep" | "growth";
  summary: string;
  source: "web" | "telegram";
};

/**
 * One getLink read for the whole batch (quick-care multi-step notify).
 */
export async function maybeNotifyBabyCareCreatedMany(
  inputs: NotifyBabyCareInput[],
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): Promise<void> {
  if (inputs.length === 0) return;
  if (!deps.isTelegramEnabled()) return;
  const link = await deps.getLink(inputs[0]!.workspaceId);
  if (!link?.confirmedAt) return;
  for (const input of inputs) {
    await deps.send(link.chatId, input.summary);
  }
}

/** Fire-and-forget batch; caches Telegram link once per mutation. */
export function scheduleNotifyBabyCareCreatedMany(
  inputs: NotifyBabyCareInput[],
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): void {
  void maybeNotifyBabyCareCreatedMany(inputs, deps).catch((err) => {
    console.error("[baby] telegram notify failed", err);
  });
}

import { runInWorkspace } from "@/db";
import { getBabyTelegramLink } from "@/features/baby/server/telegram-link";
import { isAppleWalletEnabled } from "@/lib/apple-wallet/config";
import { notifyWalletCare } from "@/lib/apple-wallet/notify";
import {
  defaultApnsSender,
  getAppleWalletStore,
} from "@/lib/apple-wallet/services";
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
  isAppleWalletEnabled?: () => boolean;
  sendWalletCareNotify?: (
    workspaceId: string,
    careSummary: string,
  ) => Promise<unknown>;
};

function defaultWalletNotify(
  workspaceId: string,
  careSummary: string,
): Promise<unknown> {
  const apns = defaultApnsSender();
  if (!apns) return Promise.resolve({ skipped: true });
  return notifyWalletCare(workspaceId, careSummary, {
    isAppleWalletEnabled: () => isAppleWalletEnabled(),
    store: getAppleWalletStore(),
    apns,
  });
}

function defaultNotifyDeps(): NotifyBabyCareDeps {
  return {
    isTelegramEnabled: () => isTelegramEnabled(),
    getLink: (workspaceId) =>
      runInWorkspace(workspaceId, () => getBabyTelegramLink(workspaceId)),
    send: (chatId, text) => sendTelegramMessage(chatId, text),
    isAppleWalletEnabled: () => isAppleWalletEnabled(),
    sendWalletCareNotify: defaultWalletNotify,
  };
}

async function notifyTelegram(
  input: {
    workspaceId: string;
    summary: string;
  },
  deps: NotifyBabyCareDeps,
): Promise<void> {
  if (!deps.isTelegramEnabled()) return;
  const link = await deps.getLink(input.workspaceId);
  if (!link?.confirmedAt) return;
  await deps.send(link.chatId, input.summary);
}

async function notifyWallet(
  input: { workspaceId: string; summary: string },
  deps: NotifyBabyCareDeps,
): Promise<void> {
  const enabled = deps.isAppleWalletEnabled?.() ?? false;
  if (!enabled) return;
  const send = deps.sendWalletCareNotify;
  if (!send) return;
  await send(input.workspaceId, input.summary);
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
  await Promise.all([
    notifyTelegram(input, deps),
    notifyWallet(input, deps),
  ]);
}

/**
 * Fire-and-forget notify so GraphQL mutations return after DB commit,
 * without waiting on Telegram / APNs network RTT.
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
    console.error("[baby] care notify failed", err);
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
 * Wallet notify runs once per step (same as Telegram sends).
 */
export async function maybeNotifyBabyCareCreatedMany(
  inputs: NotifyBabyCareInput[],
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): Promise<void> {
  if (inputs.length === 0) return;

  const telegramEnabled = deps.isTelegramEnabled();
  let link: { chatId: string; confirmedAt: Date | null } | null = null;
  if (telegramEnabled) {
    link = await deps.getLink(inputs[0]!.workspaceId);
  }

  for (const input of inputs) {
    if (telegramEnabled && link?.confirmedAt) {
      await deps.send(link.chatId, input.summary);
    }
    await notifyWallet(input, deps);
  }
}

/** Fire-and-forget batch; caches Telegram link once per mutation. */
export function scheduleNotifyBabyCareCreatedMany(
  inputs: NotifyBabyCareInput[],
  deps: NotifyBabyCareDeps = defaultNotifyDeps(),
): void {
  void maybeNotifyBabyCareCreatedMany(inputs, deps).catch((err) => {
    console.error("[baby] care notify failed", err);
  });
}

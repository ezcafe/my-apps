/** Shared Telegram helpers — gated by TELEGRAM_ENABLED (not baby-prefixed). */

import { timingSafeEqual } from "node:crypto";

export function isTelegramEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.TELEGRAM_ENABLED === "true" &&
    Boolean(env.TELEGRAM_BOT_TOKEN?.trim()) &&
    Boolean(env.TELEGRAM_WEBHOOK_SECRET?.trim())
  );
}

export function getTelegramBotToken(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!isTelegramEnabled(env)) return null;
  return env.TELEGRAM_BOT_TOKEN!.trim();
}

export function getTelegramWebhookSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!isTelegramEnabled(env)) return null;
  return env.TELEGRAM_WEBHOOK_SECRET!.trim();
}

export function verifyTelegramWebhookSecret(
  provided: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = getTelegramWebhookSecret(env);
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

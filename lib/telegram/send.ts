import {
  getTelegramBotToken,
  isTelegramEnabled,
} from "@/lib/telegram/config";

export type TelegramSendResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/** Bound fire-and-forget notify so hung api.telegram.org cannot retain forever. */
export const TELEGRAM_SEND_TIMEOUT_MS = 8_000;

export type SendTelegramMessageOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Send a text message to a Telegram chat.
 * No-ops (ok, skipped) when TELEGRAM_ENABLED is off — never throws for that case.
 * Always applies an AbortSignal timeout so hung fetches cannot pile up unboundedly.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
  opts: SendTelegramMessageOptions = {},
): Promise<TelegramSendResult> {
  if (!isTelegramEnabled(env)) {
    return { ok: true, skipped: true };
  }
  const token = getTelegramBotToken(env);
  if (!token) return { ok: true, skipped: true };

  const timeoutMs = opts.timeoutMs ?? TELEGRAM_SEND_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = opts.signal
    ? AbortSignal.any([opts.signal, timeoutSignal])
    : timeoutSignal;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal,
    });
    if (!res.ok) {
      return { ok: false, error: `telegram_http_${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, error: "telegram_timeout" };
    }
    return { ok: false, error: "telegram_network" };
  }
}

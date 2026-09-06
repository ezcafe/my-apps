import { NextResponse } from "next/server";
import { handleBabyTelegramCommand } from "@/lib/baby-telegram/commands";
import {
  isTelegramEnabled,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/request-guards";

const webhookRpm = Number(process.env.TELEGRAM_WEBHOOK_RPM ?? 120);
const jsonMaxBytes = Number(process.env.JSON_MAX_BYTES ?? 262144);

function telegramDisabled() {
  return NextResponse.json(
    { error: "Telegram is disabled", code: "telegram_disabled" },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  if (!isTelegramEnabled()) {
    return telegramDisabled();
  }

  const allowed = await enforceRateLimit({
    name: "telegram-webhook",
    request,
    points: webhookRpm,
    durationSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "rate_limited" },
      { status: 429 },
    );
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramWebhookSecret(secret)) {
    return NextResponse.json(
      { error: "Forbidden", code: "forbidden" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await readJsonBounded(request, jsonMaxBytes);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("Payload too large")) {
      return NextResponse.json(
        { error: "Payload too large", code: "payload_too_large" },
        { status: 413 },
      );
    }
    return NextResponse.json(
      { error: "Bad request", code: "bad_request" },
      { status: 400 },
    );
  }

  const message = (body as { message?: { chat?: { id?: number | string }; text?: string } })
    ?.message;
  const chatId = message?.chat?.id;
  const text = message?.text;
  if (chatId == null || !text) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await handleBabyTelegramCommand({
      chatId: String(chatId),
      text,
    });
    return NextResponse.json({ ok: true, handled: result.handled });
  } catch (e) {
    console.error("[telegram webhook]", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Request failed", code: "bad_request" },
      { status: 400 },
    );
  }
}

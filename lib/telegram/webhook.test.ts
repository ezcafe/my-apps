import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { POST } from "@/app/api/telegram/webhook/route";
import {
  isTelegramEnabled,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/config";

const ENV_KEYS = [
  "TELEGRAM_ENABLED",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
] as const;

const saved: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function enableTelegram(secret = "sec") {
  process.env.TELEGRAM_ENABLED = "true";
  process.env.TELEGRAM_BOT_TOKEN = "tok";
  process.env.TELEGRAM_WEBHOOK_SECRET = secret;
}

describe("telegram webhook route", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("disabled → 503 telegram_disabled", async () => {
    snapshotEnv();
    process.env.TELEGRAM_ENABLED = "false";
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    process.env.TELEGRAM_WEBHOOK_SECRET = "sec";

    assert.equal(isTelegramEnabled(), false);
    const res = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    assert.equal(res.status, 503);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, "telegram_disabled");
  });

  it("bad secret → 403", async () => {
    snapshotEnv();
    enableTelegram("expected-secret");
    assert.equal(
      verifyTelegramWebhookSecret("wrong"),
      false,
    );

    const res = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong",
        },
        body: JSON.stringify({ message: { chat: { id: 1 }, text: "/feed left" } }),
      }),
    );
    assert.equal(res.status, 403);
  });

  it("alternate x-telegram-secret header is ignored → 403", async () => {
    snapshotEnv();
    enableTelegram("expected-secret");

    const res = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-secret": "expected-secret",
        },
        body: JSON.stringify({
          message: { chat: { id: 1 }, text: "/feed left" },
        }),
      }),
    );
    assert.equal(res.status, 403);
  });

  it("oversized JSON body → 413", async () => {
    snapshotEnv();
    enableTelegram("expected-secret");
    const huge = "x".repeat(300_000);

    const res = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(huge.length + 20),
          "x-telegram-bot-api-secret-token": "expected-secret",
        },
        body: JSON.stringify({ pad: huge }),
      }),
    );
    assert.equal(res.status, 413);
  });

  it("oversized JSON body without Content-Length → 413", async () => {
    snapshotEnv();
    enableTelegram("expected-secret");
    const huge = "x".repeat(300_000);
    const payload = JSON.stringify({ pad: huge });

    const res = await POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "expected-secret",
        },
        body: payload,
      }),
    );
    assert.equal(res.status, 413);
  });

  it("verifyTelegramWebhookSecret requires exact match", () => {
    snapshotEnv();
    enableTelegram("expected");
    assert.equal(verifyTelegramWebhookSecret("expected"), true);
    assert.equal(verifyTelegramWebhookSecret(null), false);
    assert.equal(verifyTelegramWebhookSecret(""), false);
  });
});

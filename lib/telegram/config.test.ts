import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTelegramEnabled,
  verifyTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/send";

describe("telegram shared module", () => {
  it("enabled=false → notify resolves without fetch", async () => {
    let calls = 0;
    const result = await sendTelegramMessage(
      "123",
      "hello",
      async () => {
        calls += 1;
        return new Response("ok");
      },
      {
        TELEGRAM_ENABLED: "false",
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_WEBHOOK_SECRET: "sec",
      },
    );
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(calls, 0);
    assert.equal(
      isTelegramEnabled({ TELEGRAM_ENABLED: "false" }),
      false,
    );
  });

  it("does not invent BABY_TELEGRAM_ENABLED", () => {
    assert.equal(
      isTelegramEnabled({
        BABY_TELEGRAM_ENABLED: "true",
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_WEBHOOK_SECRET: "sec",
      } as NodeJS.ProcessEnv),
      false,
    );
  });

  it("verifyTelegramWebhookSecret rejects mismatch", () => {
    const env = {
      TELEGRAM_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "tok",
      TELEGRAM_WEBHOOK_SECRET: "secret",
    } as NodeJS.ProcessEnv;
    assert.equal(verifyTelegramWebhookSecret("secret", env), true);
    assert.equal(verifyTelegramWebhookSecret("nope", env), false);
  });

  it("verifyTelegramWebhookSecret match / mismatch / length mismatch", () => {
    const env = {
      TELEGRAM_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "tok",
      TELEGRAM_WEBHOOK_SECRET: "exact-secret",
    } as NodeJS.ProcessEnv;
    assert.equal(verifyTelegramWebhookSecret("exact-secret", env), true);
    assert.equal(verifyTelegramWebhookSecret("exact-secreX", env), false);
    assert.equal(verifyTelegramWebhookSecret("short", env), false);
    assert.equal(
      verifyTelegramWebhookSecret("exact-secret-too-long", env),
      false,
    );
  });
});

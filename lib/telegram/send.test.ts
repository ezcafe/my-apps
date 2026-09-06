import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendTelegramMessage } from "@/lib/telegram/send";

describe("sendTelegramMessage", () => {
  it("posts once when enabled; skips when disabled", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    };

    const ok = await sendTelegramMessage("1", "hi", fetchImpl, {
      TELEGRAM_ENABLED: "true",
      TELEGRAM_BOT_TOKEN: "tok",
      TELEGRAM_WEBHOOK_SECRET: "sec",
    });
    assert.equal(ok.ok, true);
    assert.equal(calls, 1);

    calls = 0;
    const skipped = await sendTelegramMessage("1", "hi", fetchImpl, {
      TELEGRAM_ENABLED: "false",
      TELEGRAM_BOT_TOKEN: "tok",
      TELEGRAM_WEBHOOK_SECRET: "sec",
    });
    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
    assert.equal(calls, 0);
  });

  it("HTTP non-OK → { ok: false }", async () => {
    const result = await sendTelegramMessage(
      "1",
      "hi",
      async () => new Response("nope", { status: 500 }),
      {
        TELEGRAM_ENABLED: "true",
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_WEBHOOK_SECRET: "sec",
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "telegram_http_500");
    }
  });

  it("network error → { ok: false }", async () => {
    const result = await sendTelegramMessage(
      "1",
      "hi",
      async () => {
        throw new Error("offline");
      },
      {
        TELEGRAM_ENABLED: "true",
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_WEBHOOK_SECRET: "sec",
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "telegram_network");
    }
  });

  it("passes AbortSignal and times out hung fetch", async () => {
    let sawSignal = false;
    const result = await sendTelegramMessage(
      "1",
      "hi",
      (_url, init) => {
        sawSignal = Boolean(init?.signal);
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
      {
        TELEGRAM_ENABLED: "true",
        TELEGRAM_BOT_TOKEN: "tok",
        TELEGRAM_WEBHOOK_SECRET: "sec",
      },
      { timeoutMs: 30 },
    );
    assert.equal(sawSignal, true);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "telegram_timeout");
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleBabyTelegramCommand,
  parseBabyTelegramCommand,
} from "@/lib/baby-telegram/commands";

describe("parseBabyTelegramCommand", () => {
  it("parses feed and diaper", () => {
    assert.deepEqual(parseBabyTelegramCommand("/feed left"), {
      kind: "feed",
      method: "breast_l",
    });
    assert.deepEqual(parseBabyTelegramCommand("/diaper wet"), {
      kind: "diaper",
      diaperKind: "wet",
    });
  });

  it("parses sleep and health", () => {
    assert.equal(parseBabyTelegramCommand("/sleep start").kind, "sleep_start");
    assert.equal(parseBabyTelegramCommand("/sleep end").kind, "sleep_end");
    assert.deepEqual(parseBabyTelegramCommand("/health fever note"), {
      kind: "health",
      text: "fever note",
    });
  });

  it("unknown for garbage", () => {
    assert.equal(parseBabyTelegramCommand("hello").kind, "unknown");
  });
});

describe("handleBabyTelegramCommand", () => {
  it("unlinked chat → handled: false", async () => {
    const result = await handleBabyTelegramCommand(
      { chatId: "unknown-chat", text: "/feed left" },
      { findLinkByChatId: async () => null },
    );
    assert.deepEqual(result, { handled: false });
  });

  it("pending link confirms on first message before write", async () => {
    let confirmed = false;
    const result = await handleBabyTelegramCommand(
      { chatId: "99", text: "hello" },
      {
        findLinkByChatId: async () => ({
          workspaceId: "ws-1",
          chatId: "99",
          linkedByUserSub: "user-1",
          confirmedAt: null,
        }),
        confirmByChatId: async () => {
          confirmed = true;
          return {
            workspaceId: "ws-1",
            chatId: "99",
            linkedByUserSub: "user-1",
            confirmedAt: new Date(),
          };
        },
      },
    );
    assert.equal(confirmed, true);
    assert.deepEqual(result, { handled: false });
  });

  it("unconfirmed chat cannot create care events when confirm fails", async () => {
    let confirmCalls = 0;
    const result = await handleBabyTelegramCommand(
      { chatId: "99", text: "/feed left" },
      {
        findLinkByChatId: async () => ({
          workspaceId: "ws-1",
          chatId: "99",
          linkedByUserSub: "user-1",
          confirmedAt: null,
        }),
        confirmByChatId: async () => {
          confirmCalls += 1;
          return null;
        },
      },
    );
    assert.equal(confirmCalls, 1);
    assert.deepEqual(result, { handled: false });
  });

  it("still-pending after confirm attempt refuses care writes", async () => {
    const result = await handleBabyTelegramCommand(
      { chatId: "99", text: "/diaper wet" },
      {
        findLinkByChatId: async () => ({
          workspaceId: "ws-1",
          chatId: "99",
          linkedByUserSub: "user-1",
          confirmedAt: null,
        }),
        confirmByChatId: async () => ({
          workspaceId: "ws-1",
          chatId: "99",
          linkedByUserSub: "user-1",
          confirmedAt: null,
        }),
      },
    );
    assert.deepEqual(result, { handled: false });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  maybeNotifyBabyCareCreated,
  scheduleNotifyBabyCareCreated,
} from "@/features/baby/server/notify";
import {
  linkBabyTelegramChat,
  unlinkBabyTelegramChat,
  confirmBabyTelegramChatByMessage,
  type TelegramLinkDeps,
} from "@/features/baby/server/telegram-link";

describe("baby telegram link", () => {
  it("link then get chat id; unlink clears", async () => {
    const store = new Map<
      string,
      {
        workspaceId: string;
        chatId: string;
        linkedAt: Date;
        linkedByUserSub: string;
        confirmedAt: Date | null;
      }
    >();

    const deps: TelegramLinkDeps = {
      getExisting: async (workspaceId) => store.get(workspaceId) ?? null,
      update: async (workspaceId, values) => {
        const next = { workspaceId, ...values };
        store.set(workspaceId, next);
        return next;
      },
      insert: async (values) => {
        const next = {
          ...values,
          linkedAt: new Date(),
          confirmedAt: values.confirmedAt ?? null,
        };
        store.set(values.workspaceId, next);
        return next;
      },
      delete: async (workspaceId) => {
        const prev = store.get(workspaceId) ?? null;
        store.delete(workspaceId);
        return prev;
      },
      confirmByChatId: async (chatId) => {
        for (const [ws, row] of store) {
          if (row.chatId === chatId) {
            const next = { ...row, confirmedAt: new Date() };
            store.set(ws, next);
            return next;
          }
        }
        return null;
      },
      isTelegramEnabled: () => true,
    };

    const linked = await linkBabyTelegramChat(
      "ws-1",
      "user-1",
      { chatId: "99" },
      deps,
    );
    assert.equal(linked.chatId, "99");
    assert.equal(linked.confirmedAt, null);
    assert.equal((await deps.getExisting("ws-1"))?.chatId, "99");

    const confirmed = await confirmBabyTelegramChatByMessage("99", deps);
    assert.ok(confirmed?.confirmedAt);
    assert.ok((await deps.getExisting("ws-1"))?.confirmedAt);

    const cleared = await unlinkBabyTelegramChat("ws-1", deps);
    assert.equal(cleared?.chatId, "99");
    assert.equal(await deps.getExisting("ws-1"), null);
  });

  it("second link replaces chatId and resets to pending", async () => {
    const store = new Map<
      string,
      {
        workspaceId: string;
        chatId: string;
        linkedAt: Date;
        linkedByUserSub: string;
        confirmedAt: Date | null;
      }
    >();

    const deps: TelegramLinkDeps = {
      getExisting: async (workspaceId) => store.get(workspaceId) ?? null,
      update: async (workspaceId, values) => {
        const next = { workspaceId, ...values };
        store.set(workspaceId, next);
        return next;
      },
      insert: async (values) => {
        const next = {
          ...values,
          linkedAt: new Date(),
          confirmedAt: values.confirmedAt ?? null,
        };
        store.set(values.workspaceId, next);
        return next;
      },
      delete: async (workspaceId) => {
        const prev = store.get(workspaceId) ?? null;
        store.delete(workspaceId);
        return prev;
      },
      confirmByChatId: async () => null,
      isTelegramEnabled: () => true,
    };

    await linkBabyTelegramChat(
      "ws-1",
      "user-1",
      { chatId: "111" },
      deps,
    );
    await confirmBabyTelegramChatByMessage("111", {
      ...deps,
      confirmByChatId: async (chatId) => {
        const row = store.get("ws-1");
        if (!row || row.chatId !== chatId) return null;
        const next = { ...row, confirmedAt: new Date() };
        store.set("ws-1", next);
        return next;
      },
    });
    const replaced = await linkBabyTelegramChat(
      "ws-1",
      "user-2",
      { chatId: "222" },
      deps,
    );
    assert.equal(replaced.chatId, "222");
    assert.equal(replaced.confirmedAt, null);
    assert.equal((await deps.getExisting("ws-1"))?.chatId, "222");
    assert.equal((await deps.getExisting("ws-1"))?.linkedByUserSub, "user-2");
  });

  it("link requires TELEGRAM_ENABLED", async () => {
    await assert.rejects(
      () =>
        linkBabyTelegramChat("ws-1", "user-1", { chatId: "1" }, {
          getExisting: async () => null,
          update: async () => {
            throw new Error("should not update");
          },
          insert: async () => {
            throw new Error("should not insert");
          },
          delete: async () => null,
          confirmByChatId: async () => null,
          isTelegramEnabled: () => false,
        }),
      (e: unknown) =>
        e instanceof Error && e.message === "TELEGRAM_DISABLED",
    );
  });
});

describe("maybeNotifyBabyCareCreated", () => {
  it("enabled + linked → send once", async () => {
    let sends = 0;
    await maybeNotifyBabyCareCreated(
      {
        workspaceId: "ws-1",
        kind: "feed",
        summary: "Feed (breast_l)",
        source: "web",
      },
      {
        isTelegramEnabled: () => true,
        getLink: async () => ({
          chatId: "1",
          confirmedAt: new Date(),
        }),
        send: async () => {
          sends += 1;
          return { ok: true };
        },
      },
    );
    assert.equal(sends, 1);
  });

  it("enabled but pending link → no send", async () => {
    let sends = 0;
    await maybeNotifyBabyCareCreated(
      {
        workspaceId: "ws-1",
        kind: "feed",
        summary: "Feed (breast_l)",
        source: "web",
      },
      {
        isTelegramEnabled: () => true,
        getLink: async () => ({
          chatId: "1",
          confirmedAt: null,
        }),
        send: async () => {
          sends += 1;
          return { ok: true };
        },
      },
    );
    assert.equal(sends, 0);
  });

  it("enabled but no link → no send", async () => {
    let sends = 0;
    await maybeNotifyBabyCareCreated(
      {
        workspaceId: "ws-1",
        kind: "feed",
        summary: "Feed (breast_l)",
        source: "web",
      },
      {
        isTelegramEnabled: () => true,
        getLink: async () => null,
        send: async () => {
          sends += 1;
          return { ok: true };
        },
      },
    );
    assert.equal(sends, 0);
  });

  it("disabled → no send", async () => {
    let sends = 0;
    await maybeNotifyBabyCareCreated(
      {
        workspaceId: "ws-1",
        kind: "diaper",
        summary: "Diaper (wet)",
        source: "web",
      },
      {
        isTelegramEnabled: () => false,
        getLink: async () => ({ chatId: "1", confirmedAt: new Date() }),
        send: async () => {
          sends += 1;
          return { ok: true };
        },
      },
    );
    assert.equal(sends, 0);
  });
});

describe("scheduleNotifyBabyCareCreated", () => {
  it("returns before slow Telegram send finishes", async () => {
    let resolveSend!: () => void;
    const sendGate = new Promise<void>((r) => {
      resolveSend = r;
    });
    let sendStarted = false;
    let sendFinished = false;

    scheduleNotifyBabyCareCreated(
      {
        workspaceId: "ws-1",
        kind: "feed",
        summary: "Feed (breast_l)",
        source: "web",
      },
      {
        isTelegramEnabled: () => true,
        getLink: async () => ({
          chatId: "1",
          confirmedAt: new Date(),
        }),
        send: async () => {
          sendStarted = true;
          await sendGate;
          sendFinished = true;
          return { ok: true };
        },
      },
    );

    // Caller continues immediately (mutation path must not await Telegram).
    assert.equal(sendFinished, false);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(sendStarted, true);
    assert.equal(sendFinished, false);
    resolveSend();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(sendFinished, true);
  });
});

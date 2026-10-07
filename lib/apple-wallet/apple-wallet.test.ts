import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarisePushResults } from "@/lib/apple-wallet/apns";
import {
  issueApplePass,
  mintAppleIssueToken,
  redeemAppleIssueToken,
  AppleIssueTokenError,
} from "@/lib/apple-wallet/issue";
import { createMemoryAppleWalletStore } from "@/lib/apple-wallet/memory-store";
import { notifyWalletCare } from "@/lib/apple-wallet/notify";
import { createAppleWebService } from "@/lib/apple-wallet/webservice";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";
import { hashIssueToken } from "@/lib/apple-wallet/store";

const apple: AppleWalletConfig = {
  passTypeId: "pass.dev.myapps.test",
  teamId: "TEAMID1234",
  signerCert: "cert",
  signerKey: "key",
  wwdr: "wwdr",
  baseUrl: "https://app.example.com",
};

function fakePassBuffer(latest: string): Buffer {
  return Buffer.from(
    JSON.stringify({
      formatVersion: 1,
      generic: {},
      latest,
    }),
  );
}

describe("apple wallet webservice", () => {
  it("register → listUpdated after bump → getPass", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date("2026-10-05T10:00:00.000Z");
    const sub = await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.ensureChannelState("ws-1", now);

    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async (_s, latest) => fakePassBuffer(latest),
    });

    const reg = await ws.register({
      deviceLibraryId: "device-a",
      passTypeId: apple.passTypeId,
      serialNumber: sub.serialNumber,
      authorization: `ApplePass ${sub.authToken}`,
      body: { pushToken: "abcdef0123456789" },
    });
    assert.equal(reg.status, 201);

    const since = String(now.getTime() - 1000);
    await store.notifyCare("ws-1", "Fed", new Date(now.getTime() + 5000));
    const listed = await ws.listUpdated({
      deviceLibraryId: "device-a",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: since,
    });
    assert.equal(listed.status, 200);
    const body = JSON.parse(String(listed.body)) as {
      serialNumbers: string[];
    };
    assert.deepEqual(body.serialNumbers, ["serial-1"]);

    const pass = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: sub.serialNumber,
      authorization: `ApplePass ${sub.authToken}`,
      ifModifiedSince: null,
    });
    assert.equal(pass.status, 200);
    assert.equal(
      pass.headers?.["content-type"],
      "application/vnd.apple.pkpass",
    );
    assert.match(String(pass.body), /Fed/);
  });

  it("bad token → 401; bad pushToken → 400; removed → 401 on getPass", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.ensureChannelState("ws-1", now);
    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async () => Buffer.from("x"),
    });

    assert.equal(
      (
        await ws.register({
          deviceLibraryId: "d1",
          passTypeId: apple.passTypeId,
          serialNumber: "serial-1",
          authorization: "ApplePass wrong-token!!!!!!",
          body: { pushToken: "abcdef0123456789" },
        })
      ).status,
      401,
    );

    assert.equal(
      (
        await ws.register({
          deviceLibraryId: "d1",
          passTypeId: apple.passTypeId,
          serialNumber: "serial-1",
          authorization: "ApplePass auth-token-16chars",
          body: { pushToken: "short" },
        })
      ).status,
      400,
    );

    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    await store.softUnlink("ws-1", "user-1", new Date());
    assert.equal(
      (
        await ws.getPass({
          passTypeId: apple.passTypeId,
          serialNumber: "serial-1",
          authorization: "ApplePass auth-token-16chars",
          ifModifiedSince: null,
        })
      ).status,
      401,
    );
  });

  it("If-Modified-Since → 304 when unchanged", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date("2026-10-05T12:00:00.000Z");
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.ensureChannelState("ws-1", now);
    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async () => Buffer.from("pk"),
    });
    const first = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      ifModifiedSince: null,
    });
    assert.equal(first.status, 200);
    const lastMod = first.headers!["last-modified"]!;
    const again = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      ifModifiedSince: lastMod,
    });
    assert.equal(again.status, 304);
  });

  it("unregister last reg → subscriber removed; orphan device deleted", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    const ws = createAppleWebService({ apple, store });
    await ws.register({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      body: { pushToken: "abcdef0123456789" },
    });
    const unreg = await ws.unregister({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
    });
    assert.equal(unreg.status, 200);
    const sub = await store.findSubscriberBySerial("serial-1");
    assert.equal(sub?.status, "removed");
    assert.equal(store.devices.has("d1"), false);

    // Idempotent unregister when reg already gone → still 200 with valid ApplePass
    const again = await ws.unregister({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
    });
    assert.equal(again.status, 200);
  });

  it("listUpdated without ApplePass works; wrong passTypeId → 404", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    const ws = createAppleWebService({ apple, store });
    const ok = await ws.listUpdated({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: null,
    });
    assert.equal(ok.status, 200);
    assert.equal(
      (
        await ws.listUpdated({
          deviceLibraryId: "d1",
          passTypeId: "pass.wrong",
          passesUpdatedSince: null,
        })
      ).status,
      404,
    );
  });

  it("two device_library_id on same serial both appear in listUpdated and notify push-token SELECT", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.registerDevice({
      deviceLibraryId: "device-a",
      pushToken: "aaaaaaaaaaaaaaaa",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    await store.registerDevice({
      deviceLibraryId: "device-b",
      pushToken: "bbbbbbbbbbbbbbbb",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    const ws = createAppleWebService({ apple, store });
    const listedA = await ws.listUpdated({
      deviceLibraryId: "device-a",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: null,
    });
    assert.equal(listedA.status, 200);
    const bodyA = JSON.parse(String(listedA.body)) as {
      serialNumbers: string[];
    };
    assert.deepEqual(bodyA.serialNumbers, ["serial-1"]);

    const listedB = await ws.listUpdated({
      deviceLibraryId: "device-b",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: null,
    });
    assert.equal(listedB.status, 200);
    const bodyB = JSON.parse(String(listedB.body)) as {
      serialNumbers: string[];
    };
    assert.deepEqual(bodyB.serialNumbers, ["serial-1"]);

    const tokens = await store.pushTokensForWorkspace("ws-1");
    assert.equal(tokens.sort().join(","), "aaaaaaaaaaaaaaaa,bbbbbbbbbbbbbbbb");
  });

  it("second register on same device/serial → 200 (idempotent)", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    const ws = createAppleWebService({ apple, store });
    const first = await ws.register({
      deviceLibraryId: "device-a",
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      body: { pushToken: "abcdef0123456789" },
    });
    assert.equal(first.status, 201);
    const again = await ws.register({
      deviceLibraryId: "device-a",
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      body: { pushToken: "abcdef0123456789" },
    });
    assert.equal(again.status, 200);
  });

  it("getPass unknown serial → 401 (no row ⇒ cannot verify ApplePass; Design 404 only after auth)", async () => {
    const store = createMemoryAppleWalletStore();
    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async () => Buffer.from("x"),
    });
    const res = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: "missing-serial",
      authorization: "ApplePass any-token-16chars",
      ifModifiedSince: null,
    });
    // Intentional WalletCast-style: without a subscriber row we cannot verify
    // the token, so 401 — not Design's post-auth 404 unknown-serial path.
    assert.equal(res.status, 401);
  });
});

describe("apple wallet issue + tokens", () => {
  it("removed subscriber re-Add → same serial, status active", async () => {
    const store = createMemoryAppleWalletStore();
    const issued = await issueApplePass("ws-1", "user-1", {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk"),
      newSerial: () => "stable-serial",
      newAuthToken: () => "stable-auth-token!!",
    });
    assert.equal(issued.subscriber.serialNumber, "stable-serial");
    await store.softUnlink("ws-1", "user-1", new Date());
    const again = await issueApplePass("ws-1", "user-1", {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk"),
      newSerial: () => "other-serial",
      newAuthToken: () => "other-auth",
    });
    assert.equal(again.subscriber.serialNumber, "stable-serial");
    assert.equal(again.subscriber.authToken, "stable-auth-token!!");
    const sub = await store.findSubscriberByWorkspaceUser("ws-1", "user-1");
    assert.equal(sub?.status, "active");
  });

  it("session reissue while active keeps same serial + auth", async () => {
    const store = createMemoryAppleWalletStore();
    const first = await issueApplePass("ws-1", "user-1", {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk"),
    });
    const second = await issueApplePass("ws-1", "user-1", {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk"),
    });
    assert.equal(first.subscriber.serialNumber, second.subscriber.serialNumber);
    assert.equal(first.subscriber.authToken, second.subscriber.authToken);
  });

  it("issue creates channel_state; getPass before care → empty latest", async () => {
    const store = createMemoryAppleWalletStore();
    let ensureCalls = 0;
    const wrapped = {
      ...store,
      subscribers: store.subscribers,
      devices: store.devices,
      registrations: store.registrations,
      channel: store.channel,
      issueTokens: store.issueTokens,
      async ensureChannelState(workspaceId: string, now: Date) {
        ensureCalls += 1;
        return store.ensureChannelState(workspaceId, now);
      },
    };
    await issueApplePass("ws-1", "user-1", {
      store: wrapped,
      config: apple,
      buildPass: async (_a) => fakePassBuffer(_a.latestMessage),
      newSerial: () => "serial-1",
      newAuthToken: () => "auth-token-16chars",
    });
    assert.equal(ensureCalls, 0, "issue must not call ensureChannelState separately");
    const channel = await store.getChannelLatest("ws-1");
    assert.ok(channel);
    assert.equal(channel.latestMessage, "");
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async (_s, latest) => fakePassBuffer(latest),
    });
    const pass = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      ifModifiedSince: null,
    });
    assert.equal(pass.status, 200);
    assert.equal(JSON.parse(String(pass.body)).latest, "");
  });

  it("upsertSubscriberForIssue ensures channel_state in the same upsert", async () => {
    const store = createMemoryAppleWalletStore();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now: new Date(),
    });
    // No separate ensureChannelState call — Major: issue tx parity.
    const channel = await store.getChannelLatest("ws-1");
    assert.ok(channel);
    assert.equal(channel.latestMessage, "");
  });

  it("redeem does not consume token when pass build fails", async () => {
    const store = createMemoryAppleWalletStore();
    const minted = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-issue-token-fail",
    });
    await assert.rejects(
      () =>
        redeemAppleIssueToken(minted.rawToken, {
          store,
          config: apple,
          buildPass: async () => {
            throw new Error("sign failed");
          },
        }),
      /sign failed/,
    );
    const row = await store.findIssueToken(hashIssueToken(minted.rawToken));
    assert.equal(row?.consumedAt, null);
    const retry = await redeemAppleIssueToken(minted.rawToken, {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk"),
    });
    assert.ok(retry.buffer);
    const after = await store.findIssueToken(hashIssueToken(minted.rawToken));
    assert.ok(after?.consumedAt);
  });

  it("concurrent redeem of one token: one pkpass winner; loser gone (410)", async () => {
    const store = createMemoryAppleWalletStore();
    const minted = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-issue-token-race",
    });

    let buildsStarted = 0;
    let releaseBuilds!: () => void;
    const bothBuilding = new Promise<void>((resolve) => {
      releaseBuilds = resolve;
    });

    const buildPass = async () => {
      buildsStarted += 1;
      if (buildsStarted === 2) releaseBuilds();
      await bothBuilding;
      return Buffer.from("pk-race");
    };

    const results = await Promise.allSettled([
      redeemAppleIssueToken(minted.rawToken, {
        store,
        config: apple,
        buildPass,
      }),
      redeemAppleIssueToken(minted.rawToken, {
        store,
        config: apple,
        buildPass,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(
      fulfilled[0]!.status === "fulfilled" &&
        fulfilled[0].value.buffer.equals(Buffer.from("pk-race")),
    );
    assert.ok(
      rejected[0]!.status === "rejected" &&
        rejected[0].reason instanceof AppleIssueTokenError &&
        rejected[0].reason.code === "gone",
    );
    const row = await store.findIssueToken(hashIssueToken(minted.rawToken));
    assert.ok(row?.consumedAt);
  });

  it("mint → redeem once → second redeem 410; expired 410; unknown 401", async () => {
    const store = createMemoryAppleWalletStore();
    let nowMs = Date.parse("2026-10-05T10:00:00.000Z");
    const minted = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      now: () => new Date(nowMs),
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-issue-token-aaaa",
    });
    assert.match(minted.url, /\/api\/apple-wallet\/issue\?t=/);

    const first = await redeemAppleIssueToken(minted.rawToken, {
      store,
      config: apple,
      now: () => new Date(nowMs),
      buildPass: async () => Buffer.from("pk"),
    });
    assert.ok(first.buffer);

    await assert.rejects(
      () =>
        redeemAppleIssueToken(minted.rawToken, {
          store,
          config: apple,
          now: () => new Date(nowMs),
          buildPass: async () => Buffer.from("pk"),
        }),
      (e: unknown) =>
        e instanceof AppleIssueTokenError && e.code === "gone",
    );

    await assert.rejects(
      () =>
        redeemAppleIssueToken("unknown-token!!!!!!", {
          store,
          config: apple,
          buildPass: async () => Buffer.from("pk"),
        }),
      (e: unknown) =>
        e instanceof AppleIssueTokenError && e.code === "unauthorized",
    );

    const expired = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      now: () => new Date(nowMs),
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-issue-token-bbbb",
    });
    nowMs += 11 * 60 * 1000;
    await assert.rejects(
      () =>
        redeemAppleIssueToken(expired.rawToken, {
          store,
          config: apple,
          now: () => new Date(nowMs),
          buildPass: async () => Buffer.from("pk"),
        }),
      (e: unknown) =>
        e instanceof AppleIssueTokenError && e.code === "gone",
    );
  });

  it("other user’s token cannot issue their pass", async () => {
    const store = createMemoryAppleWalletStore();
    const attacker = await issueApplePass("ws-1", "attacker", {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk-attacker"),
      newSerial: () => "attacker-serial",
      newAuthToken: () => "attacker-auth-tok!",
    });
    const minted = await mintAppleIssueToken("ws-1", "owner", {
      store,
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "owner-token-xxxxxxxx",
    });
    const result = await redeemAppleIssueToken(minted.rawToken, {
      store,
      config: apple,
      buildPass: async () => Buffer.from("pk-owner"),
    });
    assert.equal(result.subscriber.userSub, "owner");
    assert.equal(result.subscriber.workspaceId, "ws-1");
    assert.notEqual(
      result.subscriber.serialNumber,
      attacker.subscriber.serialNumber,
    );
    assert.notEqual(result.subscriber.authToken, attacker.subscriber.authToken);

    const attackerAfter = await store.findSubscriberByWorkspaceUser(
      "ws-1",
      "attacker",
    );
    assert.equal(attackerAfter?.serialNumber, "attacker-serial");
    assert.equal(attackerAfter?.authToken, "attacker-auth-tok!");

    // Cross-workspace: token for ws-1/owner must not create a ws-2 subscriber.
    assert.equal(
      await store.findSubscriberByWorkspaceUser("ws-2", "owner"),
      null,
    );
    assert.equal(
      await store.findSubscriberByWorkspaceUser("ws-2", "attacker"),
      null,
    );
  });

  it("prunes expired and consumed issue_token rows", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date("2026-10-05T12:00:00.000Z");
    await store.insertIssueToken({
      tokenHash: hashIssueToken("expired"),
      workspaceId: "ws-1",
      userSub: "u1",
      expiresAt: new Date(now.getTime() - 1000),
    });
    await store.insertIssueToken({
      tokenHash: hashIssueToken("consumed"),
      workspaceId: "ws-1",
      userSub: "u1",
      expiresAt: new Date(now.getTime() + 60_000),
    });
    await store.consumeIssueToken(
      (await store.findIssueToken(hashIssueToken("consumed")))!.id,
      now,
    );
    await store.insertIssueToken({
      tokenHash: hashIssueToken("active"),
      workspaceId: "ws-1",
      userSub: "u1",
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const n = await store.pruneIssueTokens(now);
    assert.equal(n, 2);
    assert.ok(await store.findIssueToken(hashIssueToken("active")));
    assert.equal(await store.findIssueToken(hashIssueToken("expired")), null);
  });
});

describe("apple wallet notify", () => {
  it("notify with fake ApnsSender records sends; 410 removes device", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "token-aliveeeeeeee",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    await store.registerDevice({
      deviceLibraryId: "d2",
      pushToken: "token-deaddddddddd",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });

    const sent: string[] = [];
    const result = await notifyWalletCare("ws-1", "Diaper", {
      isAppleWalletEnabled: () => true,
      store,
      apns: {
        async sendPassUpdates(tokens) {
          sent.push(...tokens);
          return {
            sent: 1,
            failed: 1,
            invalidTokens: ["token-deaddddddddd"],
            errors: [],
          };
        },
      },
      now: () => new Date(now.getTime() + 1000),
    });
    assert.equal(result.pushed, 1);
    assert.equal(result.pruned, 1);
    assert.equal(store.devices.has("d2"), false);
    assert.ok(store.devices.has("d1"));
    const channel = await store.getChannelLatest("ws-1");
    assert.equal(channel?.latestMessage, "Diaper");
    const subStillActive = await store.findSubscriberByWorkspaceUser(
      "ws-1",
      "user-1",
    );
    assert.equal(subStillActive?.status, "active");
  });

  it("APNs 410 prune of last device sets subscriber removed (not stuck pending)", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "token-onlyyyyyyyyy",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    await notifyWalletCare("ws-1", "Gone", {
      isAppleWalletEnabled: () => true,
      store,
      apns: {
        async sendPassUpdates() {
          return {
            sent: 0,
            failed: 1,
            invalidTokens: ["token-onlyyyyyyyyy"],
            errors: [],
          };
        },
      },
      now: () => new Date(now.getTime() + 1000),
    });
    assert.equal(store.devices.has("d1"), false);
    assert.equal(await store.countRegistrations("serial-1"), 0);
    const sub = await store.findSubscriberByWorkspaceUser("ws-1", "user-1");
    assert.equal(sub?.status, "removed");
  });

  it("removed subscribers excluded; skip when Apple off or no regs", async () => {
    const store = createMemoryAppleWalletStore();
    const now = new Date();
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    await store.softUnlink("ws-1", "user-1", now);
    let calls = 0;
    const off = await notifyWalletCare("ws-1", "x", {
      isAppleWalletEnabled: () => false,
      store,
      apns: {
        async sendPassUpdates() {
          calls += 1;
          return { sent: 0, failed: 0, invalidTokens: [], errors: [] };
        },
      },
    });
    assert.equal(off.skipped, true);
    assert.equal(calls, 0);

    // Re-add without register
    await store.upsertSubscriberForIssue({
      workspaceId: "ws-1",
      userSub: "user-1",
      serialNumber: "serial-1",
      authToken: "auth-token-16chars",
      now,
    });
    const noRegs = await notifyWalletCare("ws-1", "y", {
      isAppleWalletEnabled: () => true,
      store,
      apns: {
        async sendPassUpdates() {
          calls += 1;
          return { sent: 0, failed: 0, invalidTokens: [], errors: [] };
        },
      },
    });
    assert.equal(noRegs.skipped, true);
    assert.equal(calls, 0);
    assert.deepEqual(await store.pushTokensForWorkspace("ws-1"), []);
  });

  it("notify bumps updatedAt so listUpdated returns serial and getPass shows careSummary", async () => {
    const store = createMemoryAppleWalletStore();
    const t0 = new Date("2026-10-05T08:00:00.000Z");
    await issueApplePass("ws-1", "user-1", {
      store,
      config: apple,
      now: () => t0,
      buildPass: async (a) => fakePassBuffer(a.latestMessage),
      newSerial: () => "serial-1",
      newAuthToken: () => "auth-token-16chars",
    });
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });
    const before = (await store.findSubscriberBySerial("serial-1"))!.updatedAt;
    const t1 = new Date("2026-10-05T08:05:00.000Z");
    await notifyWalletCare("ws-1", "Bottle 120ml", {
      isAppleWalletEnabled: () => true,
      store,
      apns: {
        async sendPassUpdates() {
          return { sent: 1, failed: 0, invalidTokens: [], errors: [] };
        },
      },
      now: () => t1,
    });
    const after = (await store.findSubscriberBySerial("serial-1"))!.updatedAt;
    assert.ok(after.getTime() > before.getTime());

    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async (_s, latest) => fakePassBuffer(latest),
    });
    const listed = await ws.listUpdated({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: String(before.getTime()),
    });
    assert.equal(listed.status, 200);
    const pass = await ws.getPass({
      passTypeId: apple.passTypeId,
      serialNumber: "serial-1",
      authorization: "ApplePass auth-token-16chars",
      ifModifiedSince: null,
    });
    assert.match(String(pass.body), /Bottle 120ml/);
  });

  it("summarisePushResults flags 410 and Unregistered", () => {
    const summary = summarisePushResults([
      { token: "a", status: 200 },
      { token: "b", status: 410, reason: "Unregistered" },
      { token: "c", status: 400, reason: "BadDeviceToken" },
    ]);
    assert.equal(summary.sent, 1);
    assert.deepEqual(summary.invalidTokens.sort(), ["b", "c"]);
  });
});

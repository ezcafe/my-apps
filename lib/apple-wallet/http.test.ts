import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";
import {
  handleIssueGet,
  handleIssueTokenPost,
  handlePassKitLog,
  handleSubscriptionDelete,
  type AppleWalletHttpDeps,
} from "@/lib/apple-wallet/http";
import { createMemoryAppleWalletStore } from "@/lib/apple-wallet/memory-store";
import { createAppleWebService } from "@/lib/apple-wallet/webservice";
import { mintAppleIssueToken } from "@/lib/apple-wallet/issue";

const apple: AppleWalletConfig = {
  passTypeId: "pass.dev.myapps.test",
  teamId: "TEAMID1234",
  signerCert: "cert",
  signerKey: "key",
  wwdr: "wwdr",
  baseUrl: "https://app.example.com",
};

function makeDeps(
  overrides: Partial<AppleWalletHttpDeps> & {
    store: ReturnType<typeof createMemoryAppleWalletStore>;
  },
): AppleWalletHttpDeps {
  const { store } = overrides;
  return {
    isAppleWalletEnabled: () => true,
    getConfig: () => apple,
    store,
    resolveSessionUserSub: async () => "user-1",
    resolveBabyWorkspaceId: async () => "ws-1",
    assertBabyMember: async () => true,
    enforceRateLimit: async () => true,
    assertSameOriginStrict: () => true,
    publicOrigin: () => "https://app.example.com",
    webservice: () =>
      createAppleWebService({
        apple,
        store,
        buildPass: async () => Buffer.from("PKPASS"),
      }),
    issueRpm: () => 20,
    mintRpm: () => 20,
    logRpm: () => 60,
    ...overrides,
  };
}

describe("apple-wallet HTTP handlers", () => {
  it("GET issue returns 401 when unauthenticated", async () => {
    const store = createMemoryAppleWalletStore();
    const res = await handleIssueGet(
      new Request("https://app.example.com/api/apple-wallet/issue"),
      makeDeps({
        store,
        resolveSessionUserSub: async () => null,
      }),
    );
    assert.equal(res.status, 401);
  });

  it("GET issue member → 200 pkpass; disabled → 404 apple_disabled; non-member → 403", async () => {
    const store = createMemoryAppleWalletStore();
    const fakeBuild = async () => Buffer.from("PKPASS-BYTES");

    const ok = await handleIssueGet(
      new Request("https://app.example.com/api/apple-wallet/issue"),
      makeDeps({ store, buildPass: fakeBuild }),
    );
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Content-Type"), "application/vnd.apple.pkpass");
    assert.equal(
      ok.headers.get("Content-Disposition"),
      'attachment; filename="baby-care.pkpass"',
    );
    assert.equal(ok.headers.get("Cache-Control"), "no-store");
    assert.equal(Buffer.from(await ok.arrayBuffer()).toString(), "PKPASS-BYTES");

    const disabled = await handleIssueGet(
      new Request("https://app.example.com/api/apple-wallet/issue"),
      makeDeps({
        store,
        isAppleWalletEnabled: () => false,
      }),
    );
    assert.equal(disabled.status, 404);
    const disabledBody = (await disabled.json()) as { code: string };
    assert.equal(disabledBody.code, "apple_disabled");

    const forbiddenRes = await handleIssueGet(
      new Request("https://app.example.com/api/apple-wallet/issue"),
      makeDeps({
        store,
        assertBabyMember: async () => false,
        buildPass: fakeBuild,
      }),
    );
    assert.equal(forbiddenRes.status, 403);
  });

  it("GET issue?t= redeem once → 200; second → 410 gone; unknown → 401 unauthorized", async () => {
    const store = createMemoryAppleWalletStore();
    const minted = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-token-for-http-test",
    });
    const deps = makeDeps({
      store,
      buildPass: async () => Buffer.from("QR-PASS"),
    });
    const res = await handleIssueGet(new Request(minted.url), deps);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "application/vnd.apple.pkpass");

    const replay = await handleIssueGet(new Request(minted.url), deps);
    assert.equal(replay.status, 410);
    assert.equal(((await replay.json()) as { code: string }).code, "gone");

    const unknown = await handleIssueGet(
      new Request(
        "https://app.example.com/api/apple-wallet/issue?t=unknown-token!!!!!!",
      ),
      deps,
    );
    assert.equal(unknown.status, 401);
    assert.equal(
      ((await unknown.json()) as { code: string }).code,
      "unauthorized",
    );
  });

  it("GET issue returns 429 when rate limited", async () => {
    const store = createMemoryAppleWalletStore();
    const res = await handleIssueGet(
      new Request("https://app.example.com/api/apple-wallet/issue"),
      makeDeps({
        store,
        enforceRateLimit: async () => false,
      }),
    );
    assert.equal(res.status, 429);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, "rate_limited");
  });

  it("GET issue?t= returns 429 when rate limited before redeem; token stays redeemable", async () => {
    const store = createMemoryAppleWalletStore();
    const minted = await mintAppleIssueToken("ws-1", "user-1", {
      store,
      publicOrigin: () => "https://app.example.com",
      generateRawToken: () => "raw-token-rate-limit-qr",
    });
    const limited = await handleIssueGet(
      new Request(minted.url),
      makeDeps({
        store,
        enforceRateLimit: async () => false,
        buildPass: async () => Buffer.from("should-not-build"),
      }),
    );
    assert.equal(limited.status, 429);
    assert.equal(
      ((await limited.json()) as { code: string }).code,
      "rate_limited",
    );

    const ok = await handleIssueGet(
      new Request(minted.url),
      makeDeps({
        store,
        buildPass: async () => Buffer.from("QR-AFTER-429"),
      }),
    );
    assert.equal(ok.status, 200);
    assert.equal(
      Buffer.from(await ok.arrayBuffer()).toString(),
      "QR-AFTER-429",
    );
  });

  it("POST mint: 201 no-store; cross-origin 400; unauth 401; disabled 404; forbidden 403; rate 429", async () => {
    const store = createMemoryAppleWalletStore();

    const created = await handleIssueTokenPost(
      new Request("https://app.example.com/api/apple-wallet/issue-token", {
        method: "POST",
        body: "{}",
      }),
      makeDeps({ store }),
    );
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("Cache-Control"), "no-store");
    const json = (await created.json()) as {
      data: { url: string; expiresAt: string };
    };
    assert.match(json.data.url, /issue\?t=/);
    assert.ok(json.data.expiresAt);

    assert.equal(
      (
        await handleIssueTokenPost(
          new Request("https://app.example.com/api/apple-wallet/issue-token", {
            method: "POST",
            body: "{}",
          }),
          makeDeps({
            store,
            resolveSessionUserSub: async () => null,
          }),
        )
      ).status,
      401,
    );

    assert.equal(
      (
        await handleIssueTokenPost(
          new Request("https://app.example.com/api/apple-wallet/issue-token", {
            method: "POST",
            body: "{}",
          }),
          makeDeps({
            store,
            assertSameOriginStrict: () => false,
          }),
        )
      ).status,
      400,
    );

    const disabled = await handleIssueTokenPost(
      new Request("https://app.example.com/api/apple-wallet/issue-token", {
        method: "POST",
        body: "{}",
      }),
      makeDeps({ store, isAppleWalletEnabled: () => false }),
    );
    assert.equal(disabled.status, 404);
    assert.equal(((await disabled.json()) as { code: string }).code, "apple_disabled");

    assert.equal(
      (
        await handleIssueTokenPost(
          new Request("https://app.example.com/api/apple-wallet/issue-token", {
            method: "POST",
            body: "{}",
          }),
          makeDeps({ store, assertBabyMember: async () => false }),
        )
      ).status,
      403,
    );

    const limited = await handleIssueTokenPost(
      new Request("https://app.example.com/api/apple-wallet/issue-token", {
        method: "POST",
        body: "{}",
      }),
      makeDeps({ store, enforceRateLimit: async () => false }),
    );
    assert.equal(limited.status, 429);
    assert.equal(((await limited.json()) as { code: string }).code, "rate_limited");

    const badJson = await handleIssueTokenPost(
      new Request("https://app.example.com/api/apple-wallet/issue-token", {
        method: "POST",
        headers: { "content-length": "3", "content-type": "application/json" },
        body: "{",
      }),
      makeDeps({ store }),
    );
    assert.equal(badJson.status, 400);
    assert.equal(
      ((await badJson.json()) as { code: string }).code,
      "bad_request",
    );

    const badUuid = await handleIssueTokenPost(
      new Request("https://app.example.com/api/apple-wallet/issue-token", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "not-a-uuid" }),
      }),
      makeDeps({ store }),
    );
    assert.equal(badUuid.status, 400);
    assert.equal(
      ((await badUuid.json()) as { code: string }).code,
      "bad_request",
    );
  });

  it("PassKit log returns 429 when rate limited", async () => {
    const store = createMemoryAppleWalletStore();
    const res = await handlePassKitLog(
      new Request("https://app.example.com/api/apple/v1/log", {
        method: "POST",
        body: JSON.stringify({ logs: ["ok"] }),
      }),
      makeDeps({ store, enforceRateLimit: async () => false }),
    );
    assert.equal(res.status, 429);
    assert.equal(((await res.json()) as { code: string }).code, "rate_limited");
  });

  it("DELETE subscription → 204 idempotent; 403/400/429; after unlink getPass 401", async () => {
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
    await store.registerDevice({
      deviceLibraryId: "d1",
      pushToken: "abcdef0123456789",
      serialNumber: "serial-1",
      passTypeId: apple.passTypeId,
    });

    const deps = makeDeps({ store });
    const first = await handleSubscriptionDelete(
      new Request("https://app.example.com/api/apple-wallet/subscription", {
        method: "DELETE",
        body: "{}",
      }),
      deps,
    );
    assert.equal(first.status, 204);
    assert.equal(await store.countRegistrations("serial-1"), 0);
    assert.deepEqual(await store.pushTokensForWorkspace("ws-1"), []);
    assert.equal(store.devices.has("d1"), false);

    const second = await handleSubscriptionDelete(
      new Request("https://app.example.com/api/apple-wallet/subscription", {
        method: "DELETE",
        body: "{}",
      }),
      deps,
    );
    assert.equal(second.status, 204);

    const ws = createAppleWebService({
      apple,
      store,
      buildPass: async () => Buffer.from("x"),
    });
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
    const listed = await ws.listUpdated({
      deviceLibraryId: "d1",
      passTypeId: apple.passTypeId,
      passesUpdatedSince: null,
    });
    assert.equal(listed.status, 204);

    assert.equal(
      (
        await handleSubscriptionDelete(
          new Request("https://app.example.com/api/apple-wallet/subscription", {
            method: "DELETE",
            body: "{}",
          }),
          makeDeps({ store, assertBabyMember: async () => false }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleSubscriptionDelete(
          new Request("https://app.example.com/api/apple-wallet/subscription", {
            method: "DELETE",
            body: "{}",
          }),
          makeDeps({ store, assertSameOriginStrict: () => false }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await handleSubscriptionDelete(
          new Request("https://app.example.com/api/apple-wallet/subscription", {
            method: "DELETE",
            body: "{}",
          }),
          makeDeps({ store, enforceRateLimit: async () => false }),
        )
      ).status,
      429,
    );

    const disabled = await handleSubscriptionDelete(
      new Request("https://app.example.com/api/apple-wallet/subscription", {
        method: "DELETE",
        body: "{}",
      }),
      makeDeps({ store, isAppleWalletEnabled: () => false }),
    );
    assert.equal(disabled.status, 404);
    assert.equal(
      ((await disabled.json()) as { code: string }).code,
      "apple_disabled",
    );
  });
});

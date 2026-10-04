import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";
import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_REPLAYED_HEADER,
} from "@/lib/http-idempotency";

/**
 * Thin handler smokes for Task 6 (replay / over-128 / absent key).
 * Isolated file so mock.module applies before route modules load.
 * Always-on — no DATABASE_URL required.
 */
describe("idempotency route smokes (stubbed handlers)", () => {
  let claimCalls = 0;
  let sideEffectCalls = 0;
  let claimMode: "claimed" | "replay" = "claimed";
  let replayStatus = 200;
  let replayBody: unknown = { data: { ok: true, once: 1 } };

  let POST_INV: typeof import("@/app/api/investment/import/commit/route").POST;
  let POST_MEMBERS: typeof import("@/app/api/workspace/members/route").POST;
  let POST_MONEY: typeof import("@/app/api/money/import/commit/route").POST;
  let POST_MONEY_KIND: typeof import("@/app/api/money/import/[kind]/route").POST;
  let POST_ACTIVITIES: typeof import("@/app/api/investment/activities/route").POST;
  let POST_RESET: typeof import("@/app/api/workspace/reset/route").POST;
  let POST_MEMBERS_REMOVE: typeof import("@/app/api/workspace/members/remove/route").POST;

  before(async () => {
    const invCtx = {
      userSub: "user-1",
      workspaceId: "00000000-0000-4000-8000-000000000001",
      auth: {
        method: "session" as const,
        userSub: "user-1",
        workspaceId: "00000000-0000-4000-8000-000000000001",
        apiTokenId: null,
        apiTokenAppKey: null,
      apiTokenApps: null,
        scopes: null,
      },
    };

    const apiInv = await import("@/lib/api-investment");
    const apiMoney = await import("@/lib/api-money");
    const idem = await import("@/lib/http-idempotency");

    mock.module("@/lib/api-investment", {
      namedExports: {
        ...apiInv,
        requireInvestmentContext: async () => invCtx,
        withInvestmentWorkspaceRls: async (
          _ctx: unknown,
          run: () => Promise<unknown>,
        ) => run(),
      },
    });
    mock.module("@/lib/api-money", {
      namedExports: {
        ...apiMoney,
        requireMoneyContext: async () => invCtx,
        withMoneyWorkspaceRls: async (
          _ctx: unknown,
          run: () => Promise<unknown>,
        ) => run(),
      },
    });
    mock.module("@/lib/rate-limit", {
      namedExports: {
        enforceRateLimit: async () => true,
        rateLimitPrincipal: () => "u:user-1",
      },
    });
    mock.module("@/auth", {
      namedExports: {
        auth: async () => ({ user: { id: "user-1" } }),
        handlers: {},
        signIn: async () => {},
        signOut: async () => {},
      },
    });
    const dbMod = await import("@/db");
    mock.module("@/db", {
      namedExports: {
        ...dbMod,
        withDbTransaction: async (run: () => Promise<unknown>) => run(),
      },
    });
    mock.module("@/lib/http-idempotency", {
      namedExports: {
        ...idem,
        beginIdempotencyRequest: async (opts: {
          keyHeader: string | null;
        }) => {
          const key = opts.keyHeader?.trim() ?? "";
          if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
            const { badRequest } = await import("@/lib/api-http");
            return {
              kind: "response" as const,
              response: await badRequest(
                "Idempotency-Key must be at most 128 characters",
              ),
            };
          }
          if (!key) {
            return { kind: "proceed" as const, claimId: null };
          }
          claimCalls += 1;
          if (claimMode === "replay") {
            return {
              kind: "response" as const,
              response: idem.idempotencyReplayResponse(replayStatus, replayBody),
            };
          }
          return { kind: "proceed" as const, claimId: "claim-1" };
        },
        completeIdempotencyClaim: async () => {},
        abortIdempotencyClaim: async () => {},
        deleteIdempotencyClaim: async () => {},
      },
    });
    mock.module("@/lib/investment-services/import-statement", {
      namedExports: {
        commitInvestmentStatement: async () => {
          sideEffectCalls += 1;
          return { imported: 1 };
        },
        previewInvestmentStatement: async () => ({}),
      },
    });
    mock.module("@/lib/investment-services/activities", {
      namedExports: {
        listInvestmentActivities: async () => [],
        createInvestmentActivity: async () => {
          sideEffectCalls += 1;
          return { id: "act-1", type: "buy" };
        },
        getInvestmentActivity: async () => null,
        updateInvestmentActivity: async () => null,
        deleteInvestmentActivity: async () => false,
      },
    });
    mock.module("@/lib/workspace-context", {
      namedExports: {
        assertWorkspaceOwner: async () => true,
      },
    });
    mock.module("@/lib/workspace-reset", {
      namedExports: {
        resetWorkspaceData: async () => {
          sideEffectCalls += 1;
        },
      },
    });
    mock.module("@/lib/audit-log", {
      namedExports: {
        writeAuditEvent: async () => {},
      },
    });
    mock.module("@/lib/workspace-members", {
      namedExports: {
        addWorkspaceMember: async () => {
          sideEffectCalls += 1;
          return {
            data: {
              userSub: "member-sub-1",
              role: "member" as const,
              email: "a@b.co",
              apps: ["money"],
            },
          };
        },
        removeWorkspaceMember: async () => {
          sideEffectCalls += 1;
          return {
            data: { ok: true as const },
          };
        },
        listWorkspaceMembersForOwner: async () => [],
        patchWorkspaceMemberApps: async () => ({ data: {} }),
      },
    });
    mock.module("@/lib/money-import", {
      namedExports: {
        commitMoneyImport: async () => {
          sideEffectCalls += 1;
          return 1;
        },
      },
    });
    mock.module("@/lib/execute-money-csv-import", {
      namedExports: {
        executeMoneyCsvImport: async () => {
          sideEffectCalls += 1;
          return 2;
        },
      },
    });
    mock.module("@/lib/money-import-preview-store", {
      namedExports: {
        pruneExpiredImportPreviews: async () => {},
        getImportPreview: async () => null,
        deleteImportPreview: async () => {},
      },
    });
    mock.module("@/lib/money-import-csv", {
      namedExports: {
        validateRowsForCommit: () => ({ ok: true as const, rows: [] }),
      },
    });
    mock.module("@/lib/request-guards", {
      namedExports: {
        assertSameOriginStrict: () => true,
        readJsonBounded: async (req: Request) => req.json(),
        readJsonBoundedWithRaw: async (req: Request) => {
          const rawText = await req.text();
          return { json: JSON.parse(rawText || "{}"), rawText };
        },
        assertSameOrigin: () => true,
        assertSessionMutationCsrf: () => true,
      },
    });

    ({ POST: POST_INV } = await import(
      "@/app/api/investment/import/commit/route"
    ));
    ({ POST: POST_MEMBERS } = await import(
      "@/app/api/workspace/members/route"
    ));
    ({ POST: POST_MONEY } = await import(
      "@/app/api/money/import/commit/route"
    ));
    ({ POST: POST_MONEY_KIND } = await import(
      "@/app/api/money/import/[kind]/route"
    ));
    ({ POST: POST_ACTIVITIES } = await import(
      "@/app/api/investment/activities/route"
    ));
    ({ POST: POST_RESET } = await import("@/app/api/workspace/reset/route"));
    ({ POST: POST_MEMBERS_REMOVE } = await import(
      "@/app/api/workspace/members/remove/route"
    ));
  });

  const activityBody = JSON.stringify({
    instrumentId: "00000000-0000-4000-8000-000000000001",
    activityDate: "2026-08-22",
    type: "buy",
    quantity: "1",
    openPrice: "10",
  });
  const workspaceId = "00000000-0000-4000-8000-000000000001";

  const moneyKindCtx = {
    params: Promise.resolve({ kind: "accounts" }),
  };

  it("investmentImportCommit_idempotencyReplay: same key → one side effect + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const body = JSON.stringify({ content: "x", platform: "generic" });
    const headers = {
      authorization: "Bearer inv_test",
      "content-type": "application/json",
      "Idempotency-Key": "inv-replay-key-1",
      origin: "http://localhost",
    };

    const first = await POST_INV(
      new Request("http://localhost/api/investment/import/commit", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(first.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(first.headers.get(IDEMPOTENCY_REPLAYED_HEADER), null);

    claimMode = "replay";
    const second = await POST_INV(
      new Request("http://localhost/api/investment/import/commit", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(second.status, 200);
    assert.equal(sideEffectCalls, 1, "replay must not re-run side effect");
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
    assert.equal(second.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await second.json(), replayBody);
  });

  it("workspaceMembersAdd_idempotencyReplay: same key → one side effect + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const body = JSON.stringify({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      email: "a@b.co",
      apps: ["money"],
    });
    const headers = {
      "content-type": "application/json",
      "Idempotency-Key": "members-replay-key-1",
      origin: "http://localhost",
    };

    const first = await POST_MEMBERS(
      new Request("http://localhost/api/workspace/members", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(first.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(first.headers.get(IDEMPOTENCY_REPLAYED_HEADER), null);

    claimMode = "replay";
    const second = await POST_MEMBERS(
      new Request("http://localhost/api/workspace/members", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(second.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
    assert.equal(second.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await second.json(), replayBody);
  });

  it("money import commit: invalid body + key → 400 + no claim (validate-first)", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const res = await POST_MONEY(
      new Request("http://localhost/api/money/import/commit", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          "Idempotency-Key": "money-validate-first-1",
          origin: "http://localhost",
        },
        body: JSON.stringify({ type: "accounts" }),
      }),
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, "bad_request");
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 0);
  });

  it("money import commit: Idempotency-Key > 128 → 400 + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const longKey = "k".repeat(IDEMPOTENCY_KEY_MAX_LENGTH + 1);
    const res = await POST_MONEY(
      new Request("http://localhost/api/money/import/commit", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          "Idempotency-Key": longKey,
          origin: "http://localhost",
        },
        body: JSON.stringify({ type: "accounts", rows: [{ name: "Cash" }] }),
      }),
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, "bad_request");
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 0);
  });

  it("money import commit: absent Idempotency-Key → success path + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const res = await POST_MONEY(
      new Request("http://localhost/api/money/import/commit", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          origin: "http://localhost",
        },
        body: JSON.stringify({ type: "accounts", rows: [{ name: "Cash" }] }),
      }),
    );
    assert.equal(res.status, 200);
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 1);
    const body = (await res.json()) as { data: { imported: number } };
    assert.equal(body.data.imported, 1);
  });

  it("money import kind: same key → one side effect + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const body = JSON.stringify({ rows: [{ name: "Cash" }] });
    const headers = {
      authorization: "Bearer mny_test",
      "content-type": "application/json",
      "Idempotency-Key": "money-kind-replay-1",
      origin: "http://localhost",
    };

    const first = await POST_MONEY_KIND(
      new Request("http://localhost/api/money/import/accounts", {
        method: "POST",
        headers,
        body,
      }),
      moneyKindCtx,
    );
    assert.equal(first.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(first.headers.get(IDEMPOTENCY_REPLAYED_HEADER), null);
    assert.deepEqual(await first.json(), { data: { created: 2 } });

    claimMode = "replay";
    const second = await POST_MONEY_KIND(
      new Request("http://localhost/api/money/import/accounts", {
        method: "POST",
        headers,
        body,
      }),
      moneyKindCtx,
    );
    assert.equal(second.status, 200);
    assert.equal(sideEffectCalls, 1, "replay must not re-run side effect");
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
    assert.deepEqual(await second.json(), replayBody);
  });

  it("money import kind: invalid body + key → 400 + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const res = await POST_MONEY_KIND(
      new Request("http://localhost/api/money/import/accounts", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          "Idempotency-Key": "money-kind-validate-1",
          origin: "http://localhost",
        },
        body: JSON.stringify({ notRows: true }),
      }),
      moneyKindCtx,
    );
    assert.equal(res.status, 400);
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 0);
  });

  it("money import kind: Idempotency-Key > 128 → 400 + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const longKey = "k".repeat(IDEMPOTENCY_KEY_MAX_LENGTH + 1);
    const res = await POST_MONEY_KIND(
      new Request("http://localhost/api/money/import/accounts", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          "Idempotency-Key": longKey,
          origin: "http://localhost",
        },
        body: JSON.stringify({ rows: [{ name: "Cash" }] }),
      }),
      moneyKindCtx,
    );
    assert.equal(res.status, 400);
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 0);
  });

  it("money import kind: absent Idempotency-Key → success + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const res = await POST_MONEY_KIND(
      new Request("http://localhost/api/money/import/accounts", {
        method: "POST",
        headers: {
          authorization: "Bearer mny_test",
          "content-type": "application/json",
          origin: "http://localhost",
        },
        body: JSON.stringify({ rows: [{ name: "Cash" }] }),
      }),
      moneyKindCtx,
    );
    assert.equal(res.status, 200);
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 1);
    const body = (await res.json()) as { data: { created: number } };
    assert.equal(body.data.created, 2);
  });

  it("investmentActivities_idempotencyReplay: same key → one create + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    replayStatus = 201;
    replayBody = { data: { id: "act-1", type: "buy" } };
    const headers = {
      authorization: "Bearer inv_test",
      "content-type": "application/json",
      "Idempotency-Key": "inv-act-replay-1",
      origin: "http://localhost",
    };

    const first = await POST_ACTIVITIES(
      new Request("http://localhost/api/investment/activities", {
        method: "POST",
        headers,
        body: activityBody,
      }),
    );
    assert.equal(first.status, 201);
    assert.equal(sideEffectCalls, 1);
    assert.equal(first.headers.get(IDEMPOTENCY_REPLAYED_HEADER), null);

    claimMode = "replay";
    const second = await POST_ACTIVITIES(
      new Request("http://localhost/api/investment/activities", {
        method: "POST",
        headers,
        body: activityBody,
      }),
    );
    assert.equal(second.status, 201);
    assert.equal(sideEffectCalls, 1);
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
    assert.deepEqual(await second.json(), replayBody);
  });

  it("investmentActivities: invalid body + key → 400 + no claim", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    const res = await POST_ACTIVITIES(
      new Request("http://localhost/api/investment/activities", {
        method: "POST",
        headers: {
          authorization: "Bearer inv_test",
          "content-type": "application/json",
          "Idempotency-Key": "inv-act-bad-1",
          origin: "http://localhost",
        },
        body: JSON.stringify({ type: "buy" }),
      }),
    );
    assert.equal(res.status, 400);
    assert.equal(claimCalls, 0);
    assert.equal(sideEffectCalls, 0);
  });

  it("workspaceReset_idempotencyReplay: same key → one side effect + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    replayStatus = 200;
    replayBody = { ok: true, data: { workspaceId } };
    const body = JSON.stringify({ workspaceId });
    const headers = {
      "content-type": "application/json",
      "Idempotency-Key": "ws-reset-replay-1",
      origin: "http://localhost",
    };

    const first = await POST_RESET(
      new Request("http://localhost/api/workspace/reset", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(first.status, 200);
    assert.equal(sideEffectCalls, 1);

    claimMode = "replay";
    const second = await POST_RESET(
      new Request("http://localhost/api/workspace/reset", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(second.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
  });

  it("workspaceMembersRemove_idempotencyReplay: same key → one side effect + Idempotency-Replayed", async () => {
    claimCalls = 0;
    sideEffectCalls = 0;
    claimMode = "claimed";
    replayStatus = 200;
    replayBody = { data: { ok: true } };
    const body = JSON.stringify({
      workspaceId,
      userSub: "member-sub-1",
    });
    const headers = {
      "content-type": "application/json",
      "Idempotency-Key": "members-remove-replay-1",
      origin: "http://localhost",
    };

    const first = await POST_MEMBERS_REMOVE(
      new Request("http://localhost/api/workspace/members/remove", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(first.status, 200);
    assert.equal(sideEffectCalls, 1);

    claimMode = "replay";
    const second = await POST_MEMBERS_REMOVE(
      new Request("http://localhost/api/workspace/members/remove", {
        method: "POST",
        headers,
        body,
      }),
    );
    assert.equal(second.status, 200);
    assert.equal(sideEffectCalls, 1);
    assert.equal(second.headers.get(IDEMPOTENCY_REPLAYED_HEADER), "true");
  });
});

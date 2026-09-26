import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApiTokenScope } from "@/db/schema/api-token";
import type { ShareableWorkspaceAppKey } from "@/lib/workspace-shareable-apps";
import {
  WatchPairError,
  formatApiPairingTokenName,
  hashWatchPairCode,
  isValidWatchPairCodeShape,
  normalizeWatchPairCode,
} from "@/lib/watch-pairing-codes";
import {
  mintWatchPairingCode,
  redeemWatchPairingCode,
  type WatchPairingDeps,
} from "@/lib/watch-pairing-service";
import { watchPairMintSchema } from "@/lib/validators/watch-pair";

type Row = {
  id: string;
  userSub: string;
  workspaceId: string;
  codeHash: string;
  apps: ShareableWorkspaceAppKey[];
  scopes: ApiTokenScope[];
  expiresAt: Date;
  consumedAt: Date | null;
};

function makeFake(opts?: {
  now?: Date;
  code?: string;
  assertOk?: boolean;
}) {
  const rows: Row[] = [];
  const created: Array<{
    token: string;
    apps: ShareableWorkspaceAppKey[];
    scopes: ApiTokenScope[];
    name: string;
  }> = [];
  let now = opts?.now ?? new Date("2026-09-26T12:00:00.000Z");
  let nextCode = opts?.code ?? "AB7K2Q";
  let assertOk = opts?.assertOk ?? true;
  let revokeCalls = 0;

  const deps: WatchPairingDeps = {
    now: () => now,
    resolveWorkspaceId: async () => "ws-1",
    assertAppAccess: async () => assertOk,
    invalidatePriorCodes: async (userSub) => {
      for (const r of rows) {
        if (r.userSub === userSub && !r.consumedAt) r.consumedAt = now;
      }
    },
    insertCode: async (row) => {
      rows.push({
        id: `id-${rows.length + 1}`,
        userSub: row.userSub,
        workspaceId: row.workspaceId,
        codeHash: row.codeHash,
        apps: row.apps,
        scopes: row.scopes,
        expiresAt: row.expiresAt,
        consumedAt: null,
      });
    },
    findByHash: async (codeHash) => {
      const r = rows.find((x) => x.codeHash === codeHash);
      return r
        ? {
            id: r.id,
            userSub: r.userSub,
            workspaceId: r.workspaceId,
            apps: r.apps,
            scopes: r.scopes,
            expiresAt: r.expiresAt,
            consumedAt: r.consumedAt,
          }
        : null;
    },
    markConsumed: async (id, at) => {
      const r = rows.find((x) => x.id === id);
      if (!r || r.consumedAt) return false;
      r.consumedAt = at;
      return true;
    },
    createWatchToken: async (userSub, workspaceId, apps, scopes, name) => {
      const t = `mny_watch_${userSub}_${workspaceId}`;
      const id = `tok-${created.length + 1}`;
      created.push({ token: t, apps, scopes, name });
      return { token: t, tokenId: id };
    },
    publicOrigin: () => "https://app.example.com/",
    generateCode: () => nextCode,
  };

  return {
    deps,
    rows,
    created,
    get revokeCalls() {
      return revokeCalls;
    },
    bumpRevoke: () => {
      revokeCalls += 1;
    },
    setAssertOk: (v: boolean) => {
      assertOk = v;
    },
    setNow: (d: Date) => {
      now = d;
    },
    setCode: (c: string) => {
      nextCode = c;
    },
  };
}

const babyMint = { apps: ["baby"] as ShareableWorkspaceAppKey[] };

describe("watch-pairing-codes", () => {
  it("normalizes trim and uppercase", () => {
    assert.equal(normalizeWatchPairCode("  ab7k2q  "), "AB7K2Q");
  });

  it("validates alphabet and length", () => {
    assert.equal(isValidWatchPairCodeShape("AB7K2Q"), true);
    assert.equal(isValidWatchPairCodeShape("AB01IQ"), false);
    assert.equal(isValidWatchPairCodeShape("ABC"), false);
  });

  it("hashes stably", () => {
    assert.equal(
      hashWatchPairCode("AB7K2Q"),
      hashWatchPairCode(normalizeWatchPairCode(" ab7k2q ")),
    );
  });

  it("formatApiPairingTokenName includes prefix", () => {
    assert.match(
      formatApiPairingTokenName(new Date("2026-09-26T12:00:00.000Z")),
      /^API pairing · /,
    );
  });
});

describe("watchPairMintSchema", () => {
  it("rejects empty apps", () => {
    const r = watchPairMintSchema.safeParse({ apps: [] });
    assert.equal(r.success, false);
  });

  it("rejects unknown app key", () => {
    const r = watchPairMintSchema.safeParse({ apps: ["notes"] });
    assert.equal(r.success, false);
  });

  it("accepts money with read-only scopes", () => {
    const r = watchPairMintSchema.safeParse({
      apps: ["money"],
      scopes: ["read"],
    });
    assert.equal(r.success, true);
  });
});

describe("watch-pairing-service", () => {
  it("mint rejects empty apps", async () => {
    const f = makeFake();
    await assert.rejects(
      () => mintWatchPairingCode("user-1", { apps: [] }, f.deps),
      (e: unknown) => e instanceof WatchPairError && e.code === "BAD_REQUEST",
    );
  });

  it("mint throws FORBIDDEN when app access fails", async () => {
    const f = makeFake({ assertOk: false });
    await assert.rejects(
      () => mintWatchPairingCode("user-1", babyMint, f.deps),
      (e: unknown) => e instanceof WatchPairError && e.code === "FORBIDDEN",
    );
  });

  it("mintInvalidatesPriorUnconsumedCode", async () => {
    const f = makeFake({ code: "AAAAAA" });
    await mintWatchPairingCode("user-1", babyMint, f.deps);
    f.setCode("BBBBBB");
    await mintWatchPairingCode("user-1", babyMint, f.deps);
    assert.equal(f.rows.length, 2);
    assert.ok(f.rows[0]!.consumedAt);
    assert.equal(f.rows[1]!.consumedAt, null);
  });

  it("mint stores apps and scopes", async () => {
    const f = makeFake({ code: "MONEY1" });
    await mintWatchPairingCode(
      "user-1",
      { apps: ["money", "baby"], scopes: ["read"] },
      f.deps,
    );
    assert.deepEqual(f.rows[0]!.apps, ["money", "baby"]);
    assert.deepEqual(f.rows[0]!.scopes, ["read"]);
  });

  it("redeemExpiredReturnsEXPIRED", async () => {
    const f = makeFake({
      now: new Date("2026-09-26T12:00:00.000Z"),
      code: "AB7K2Q",
    });
    await mintWatchPairingCode("user-1", babyMint, f.deps);
    f.setNow(new Date("2026-09-26T12:20:00.000Z"));
    await assert.rejects(
      () => redeemWatchPairingCode("AB7K2Q", f.deps),
      (e: unknown) => e instanceof WatchPairError && e.code === "EXPIRED",
    );
  });

  it("redeem uses stored apps/scopes and does not auto-revoke", async () => {
    const f = makeFake({ code: "AB7K2Q" });
    await mintWatchPairingCode(
      "user-1",
      { apps: ["money"], scopes: ["read", "write"] },
      f.deps,
    );
    const first = await redeemWatchPairingCode(" ab7k2q ", f.deps);
    assert.equal(first.baseURL, "https://app.example.com");
    assert.equal(first.token, "mny_watch_user-1_ws-1");
    assert.deepEqual(f.created[0]!.apps, ["money"]);
    assert.deepEqual(f.created[0]!.scopes, ["read", "write"]);
    assert.match(f.created[0]!.name, /^API pairing · /);
    assert.equal(f.revokeCalls, 0);
    await assert.rejects(
      () => redeemWatchPairingCode("AB7K2Q", f.deps),
      (e: unknown) => e instanceof WatchPairError && e.code === "CONSUMED",
    );
  });

  it("unknown code INVALID_CODE", async () => {
    const f = makeFake();
    await assert.rejects(
      () => redeemWatchPairingCode("NNNNNN", f.deps),
      (e: unknown) => e instanceof WatchPairError && e.code === "INVALID_CODE",
    );
  });
});

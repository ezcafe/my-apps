import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { db, runInWorkspace } from "@/db";
import { responseCacheSessionKey } from "@/lib/graphql/money-yoga";

describe("responseCacheSessionKey", () => {
  it("keys api tokens by token fingerprint", () => {
    const request = new Request("http://localhost/api/graphql", {
      headers: {
        authorization: "Bearer mny_1234567890abcdefghijklmnopqrstuvwxyz",
      },
    });
    const key = responseCacheSessionKey(request);
    assert.ok(key?.startsWith("api:"));
  });

  it("includes workspace cookie for session requests", () => {
    const request = new Request("http://localhost/api/graphql", {
      headers: {
        cookie:
          "ctx_workspace_money=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa; authjs.session-token=session-1",
      },
    });
    const key = responseCacheSessionKey(request);
    assert.ok(key?.startsWith("cookie:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:"));
  });

  it("returns null when request is anonymous", () => {
    const request = new Request("http://localhost/api/graphql");
    assert.equal(responseCacheSessionKey(request), null);
  });
});

describe("workspace RLS context", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it(
    "keeps app.workspace_id isolated per runInWorkspace call",
    { skip: !hasDb },
    async () => {
      const wsA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      const wsB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

      const readSetting = async () => {
        const result = await db.execute(
          sql`SELECT current_setting('app.workspace_id', true) AS workspace_id`,
        );
        const rows = Array.from(
          result as unknown as Iterable<{ workspace_id: string | null }>,
        );
        return rows[0]?.workspace_id ?? null;
      };

      const settingA = await runInWorkspace(wsA, readSetting);
      const settingB = await runInWorkspace(wsB, readSetting);
      const settingOutside = await readSetting();

      assert.equal(settingA, wsA);
      assert.equal(settingB, wsB);
      assert.equal(settingOutside, null);
    },
  );
});

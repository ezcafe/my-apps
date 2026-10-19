import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QueryClient } from "@tanstack/react-query";
import { invalidateMoneyWorkspaceQueries } from "@/lib/money-query-options";
import { investmentKeys } from "@/lib/investment-query-options";

/**
 * Pay / add-tx e2e stuck on "Saving…" with no success toast when invalidate
 * awaited refetchType "all" (inactive analytics + investments storm).
 * Active-only keeps toast path responsive.
 */
describe("invalidateMoneyWorkspaceQueries", () => {
  it("marks money + investment caches stale with active refetch only", async () => {
    const calls: Array<{ queryKey: unknown; refetchType?: string }> = [];
    const queryClient = {
      invalidateQueries: async (opts: {
        queryKey: unknown;
        refetchType?: string;
      }) => {
        calls.push({
          queryKey: opts.queryKey,
          refetchType: opts.refetchType,
        });
      },
    } as unknown as QueryClient;

    await invalidateMoneyWorkspaceQueries(queryClient);

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]?.queryKey, ["money"]);
    assert.equal(
      calls[0]?.refetchType,
      "active",
      "money invalidate must not use refetchType all — hangs Pay/add-tx toast",
    );
    assert.deepEqual(calls[1]?.queryKey, investmentKeys.all);
    assert.equal(
      calls[1]?.refetchType,
      "active",
      "investment invalidate must not use refetchType all",
    );
  });
});

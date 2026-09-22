import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_QUICK_DEFINITE_NO_COMMIT_CODES,
  babyHomeSaveAnnouncement,
  classifyBabyQuickCareError,
  softInvalidateAfterQuickCare,
} from "@/lib/baby-quick-care-outcome";
import { UserFacingError } from "@/lib/user-facing-error";

describe("classifyBabyQuickCareError", () => {
  it("allowlists definite-no-commit codes", () => {
    assert.deepEqual(BABY_QUICK_DEFINITE_NO_COMMIT_CODES, [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "SERVICE_UNAVAILABLE",
    ]);
    for (const code of BABY_QUICK_DEFINITE_NO_COMMIT_CODES) {
      assert.equal(
        classifyBabyQuickCareError({ extensions: { code } }),
        "definiteNoCommit",
      );
    }
  });

  it("honors UserFacingError.code (circuit wrapper shape)", () => {
    for (const code of BABY_QUICK_DEFINITE_NO_COMMIT_CODES) {
      assert.equal(
        classifyBabyQuickCareError(new UserFacingError("msg", { code })),
        "definiteNoCommit",
      );
    }
    assert.equal(
      classifyBabyQuickCareError(
        new UserFacingError("msg", { code: "BAD_REQUEST" }),
      ),
      "ambiguous",
    );
  });

  it("walks error.cause for UserFacingError.code", () => {
    const inner = new UserFacingError("inner", { code: "NOT_FOUND" });
    const outer = new Error("wrapped", { cause: inner });
    assert.equal(classifyBabyQuickCareError(outer), "definiteNoCommit");
  });

  it("BAD_REQUEST is ambiguous — catch-all can be post-commit", () => {
    assert.equal(
      classifyBabyQuickCareError({ extensions: { code: "BAD_REQUEST" } }),
      "ambiguous",
    );
  });

  it("CONFLICT, DB_UNAVAILABLE, 5xx, unknown, and network are ambiguous", () => {
    for (const code of [
      "CONFLICT",
      "DB_UNAVAILABLE",
      "INTERNAL_SERVER_ERROR",
      "WEIRD",
    ]) {
      assert.equal(
        classifyBabyQuickCareError({ extensions: { code } }),
        "ambiguous",
      );
    }
    assert.equal(classifyBabyQuickCareError(new Error("network")), "ambiguous");
    assert.equal(classifyBabyQuickCareError(undefined), "ambiguous");
  });
});

describe("softInvalidateAfterQuickCare", () => {
  it("awaits invalidate and resolves when it succeeds", async () => {
    let called = 0;
    await softInvalidateAfterQuickCare(async () => {
      called += 1;
    });
    assert.equal(called, 1);
  });

  it("swallows refetch failures so success UI is not undone", async () => {
    await softInvalidateAfterQuickCare(async () => {
      throw new Error("refetch failed");
    });
  });

  it("no-ops when invalidate is omitted", async () => {
    await softInvalidateAfterQuickCare();
    await softInvalidateAfterQuickCare(undefined);
  });
});

describe("babyHomeSaveAnnouncement", () => {
  it("prefers confirmation over Saving while soft-invalidate runs", () => {
    assert.equal(
      babyHomeSaveAnnouncement({
        saving: true,
        message: "Saved diaper",
        savingLabel: "Saving…",
      }),
      "Saved diaper",
    );
    assert.equal(
      babyHomeSaveAnnouncement({
        saving: true,
        message: null,
        savingLabel: "Saving…",
      }),
      "Saving…",
    );
    assert.equal(
      babyHomeSaveAnnouncement({
        saving: false,
        message: null,
        savingLabel: "Saving…",
      }),
      null,
    );
  });
});

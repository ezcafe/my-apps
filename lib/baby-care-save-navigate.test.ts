import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_AFTER_CARE_SAVE_HREF,
  BABY_CARE_AFTER_SAVE,
  navigateAfterBabyCareSave,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";

describe("BABY_CARE_AFTER_SAVE caller contracts", () => {
  it("locks feed method + sleep End + diaper to home; sleep Start to stay", () => {
    assert.equal(BABY_CARE_AFTER_SAVE.feedMethod, "home");
    assert.equal(BABY_CARE_AFTER_SAVE.sleepStart, "stay");
    assert.equal(BABY_CARE_AFTER_SAVE.sleepEnd, "home");
    assert.equal(BABY_CARE_AFTER_SAVE.diaper, "home");
  });
});

describe("navigateAfterBabyCareSave", () => {
  it("pushes /baby (not timeline) on success", () => {
    const pushed: string[] = [];
    navigateAfterBabyCareSave({ push: (href) => pushed.push(href) });
    assert.deepEqual(pushed, ["/baby"]);
    assert.equal(BABY_AFTER_CARE_SAVE_HREF, "/baby");
    assert.notEqual(pushed[0], "/baby/timeline");
  });
});

describe("runBabyCareSaveThenNavigate", () => {
  it("navigates to /baby when mutate resolves (default home)", async () => {
    const pushed: string[] = [];
    let success = false;
    let error: unknown;
    await runBabyCareSaveThenNavigate({
      mutate: async () => {},
      onSuccess: async () => {
        success = true;
      },
      onError: (e) => {
        error = e;
      },
      router: { push: (href) => pushed.push(href) },
    });
    assert.equal(success, true);
    assert.equal(error, undefined);
    assert.deepEqual(pushed, ["/baby"]);
  });

  it("navigates to /baby when afterSave is home", async () => {
    const pushed: string[] = [];
    await runBabyCareSaveThenNavigate({
      mutate: async () => {},
      onSuccess: async () => {},
      onError: () => {},
      router: { push: (href) => pushed.push(href) },
      afterSave: BABY_CARE_AFTER_SAVE.feedMethod,
    });
    assert.deepEqual(pushed, ["/baby"]);
  });

  it("runs mutate + onSuccess and does not push when afterSave is stay", async () => {
    const pushed: string[] = [];
    let success = false;
    await runBabyCareSaveThenNavigate({
      mutate: async () => {},
      onSuccess: async () => {
        success = true;
      },
      onError: () => {},
      router: { push: (href) => pushed.push(href) },
      afterSave: BABY_CARE_AFTER_SAVE.sleepStart,
    });
    assert.equal(success, true);
    assert.deepEqual(pushed, []);
  });

  it("sleep End contract navigates home", async () => {
    const pushed: string[] = [];
    await runBabyCareSaveThenNavigate({
      mutate: async () => {},
      onSuccess: async () => {},
      onError: () => {},
      router: { push: (href) => pushed.push(href) },
      afterSave: BABY_CARE_AFTER_SAVE.sleepEnd,
    });
    assert.deepEqual(pushed, ["/baby"]);
  });

  it("stays on form with no router.push when mutate rejects", async () => {
    const pushed: string[] = [];
    let success = false;
    let caught: unknown;
    const fail = new Error("mutation failed");
    await runBabyCareSaveThenNavigate({
      mutate: async () => {
        throw fail;
      },
      onSuccess: async () => {
        success = true;
      },
      onError: (e) => {
        caught = e;
      },
      router: { push: (href) => pushed.push(href) },
      afterSave: BABY_CARE_AFTER_SAVE.diaper,
    });
    assert.equal(success, false);
    assert.equal(caught, fail);
    assert.deepEqual(pushed, []);
  });

  it("does not navigate when onSuccess throws after mutate", async () => {
    const pushed: string[] = [];
    let caught: unknown;
    const fail = new Error("invalidate failed");
    await runBabyCareSaveThenNavigate({
      mutate: async () => {},
      onSuccess: async () => {
        throw fail;
      },
      onError: (e) => {
        caught = e;
      },
      router: { push: (href) => pushed.push(href) },
      afterSave: BABY_CARE_AFTER_SAVE.sleepStart,
    });
    assert.equal(caught, fail);
    assert.deepEqual(pushed, []);
  });
});

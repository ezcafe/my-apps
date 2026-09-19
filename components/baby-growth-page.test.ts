import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { BABY_CARE_AFTER_SAVE } from "@/lib/baby-care-save-navigate";
import { BABY_GROWTH_PAGE_DEFAULT_CHIP } from "@/lib/baby-growth-page-chips";
import { runBabyGrowthPageSaveThenStay } from "@/lib/baby-growth-page-save";

describe("BabyGrowthPage save success path", () => {
  it("locks Growth afterSave to stay (not diaper/home)", () => {
    assert.equal(BABY_CARE_AFTER_SAVE.growth, "stay");
    assert.notEqual(BABY_CARE_AFTER_SAVE.growth, BABY_CARE_AFTER_SAVE.diaper);
    assert.notEqual(BABY_CARE_AFTER_SAVE.growth, "home");
  });

  it("vaccine success: mutate vaccine, invalidate vaccines, never push /baby", async () => {
    const pushed: string[] = [];
    const targets: string[] = [];
    const scopes: string[] = [];
    let resetChip: string | null = null;

    await runBabyGrowthPageSaveThenStay({
      kind: "vaccine",
      mutate: async (target) => {
        targets.push(target);
      },
      onSuccess: async ({ mutationTarget, invalidateScope }) => {
        assert.equal(mutationTarget, "vaccine");
        scopes.push(invalidateScope);
        resetChip = BABY_GROWTH_PAGE_DEFAULT_CHIP;
      },
      onError: () => {
        assert.fail("onError should not run on success");
      },
      router: { push: (href) => pushed.push(href) },
    });

    assert.deepEqual(targets, ["vaccine"]);
    assert.deepEqual(scopes, ["vaccines"]);
    assert.equal(resetChip, "weight");
    assert.deepEqual(pushed, []);
    assert.ok(!pushed.includes("/baby"));
  });

  it("growth-kind success: mutate growth, invalidate growth, never push /baby", async () => {
    const pushed: string[] = [];
    const targets: string[] = [];
    const scopes: string[] = [];
    let resetChip: string | null = null;

    await runBabyGrowthPageSaveThenStay({
      kind: "weight",
      mutate: async (target) => {
        targets.push(target);
      },
      onSuccess: async ({ mutationTarget, invalidateScope }) => {
        assert.equal(mutationTarget, "growth");
        scopes.push(invalidateScope);
        resetChip = BABY_GROWTH_PAGE_DEFAULT_CHIP;
      },
      onError: () => {
        assert.fail("onError should not run on success");
      },
      router: { push: (href) => pushed.push(href) },
    });

    assert.deepEqual(targets, ["growth"]);
    assert.deepEqual(scopes, ["growth"]);
    assert.equal(resetChip, "weight");
    assert.deepEqual(pushed, []);
    assert.ok(!pushed.includes("/baby"));
  });

  it("page wires save through runBabyGrowthPageSaveThenStay (not diaper afterSave)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-growth-page.tsx"),
      "utf8",
    );
    assert.match(src, /runBabyGrowthPageSaveThenStay/);
    assert.doesNotMatch(src, /runBabyCareSaveThenNavigate/);
    assert.doesNotMatch(src, /afterSave:\s*BABY_CARE_AFTER_SAVE\.diaper/);
    assert.match(src, /invalidateBabyQueries\(queryClient,\s*invalidateScope\)/);
    assert.match(src, /setKind\(BABY_GROWTH_PAGE_DEFAULT_CHIP\)|BABY_GROWTH_PAGE_DEFAULT_CHIP/);
  });

  it("uses money Amount + Category extracts (no checkbox symptoms)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-growth-page.tsx"),
      "utf8",
    );
    assert.match(src, /MoneyAmountField/);
    assert.match(src, /MoneyCategoryField/);
    assert.match(src, /MoneyMultiCategoryField/);
    assert.doesNotMatch(src, /from "@\/components\/ui\/checkbox"/);
    assert.doesNotMatch(src, /InputGroup/);
  });

  it("page clears sticky ?kind= on success and applies kind param only on change", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-growth-page.tsx"),
      "utf8",
    );
    assert.match(src, /babyGrowthChipWhenKindParamChanges/);
    assert.match(src, /BABY_GROWTH_CAPTURE_HREF/);
    assert.match(src, /router\.replace\(\s*BABY_GROWTH_CAPTURE_HREF\s*\)/);
    assert.doesNotMatch(
      src,
      /useEffect\(\(\)\s*=>\s*\{[^}]*resolveBabyGrowthPageChipFromKindParam/,
    );
  });

  it("vaccine mutate uses growthVaccineCreateInput (not inline input)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/baby-growth-page.tsx"),
      "utf8",
    );
    assert.match(src, /growthVaccineCreateInput/);
    assert.doesNotMatch(
      src,
      /input:\s*\{\s*name:\s*name\.trim\(\),\s*dose:\s*vaccineDose\s*\}/,
    );
  });
});

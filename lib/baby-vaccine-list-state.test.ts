import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyVaccineDoseLabelKey,
  babyVaccineHasMorePages,
  babyVaccineListCopy,
  babyVaccineListState,
} from "@/lib/baby-vaccine-list-state";

describe("babyVaccineListState", () => {
  it("maps loading/error/empty/ready", () => {
    assert.equal(
      babyVaccineListState({ isLoading: true, isError: false, entryCount: 0 }),
      "loading",
    );
    assert.equal(
      babyVaccineListState({ isLoading: false, isError: true, entryCount: 0 }),
      "error",
    );
    assert.equal(
      babyVaccineListState({ isLoading: false, isError: false, entryCount: 0 }),
      "empty",
    );
    assert.equal(
      babyVaccineListState({ isLoading: false, isError: false, entryCount: 2 }),
      "ready",
    );
  });
});

describe("babyVaccineDoseLabelKey", () => {
  it("maps first and second", () => {
    assert.equal(babyVaccineDoseLabelKey("first"), "vaccine.doseFirst");
    assert.equal(babyVaccineDoseLabelKey("second"), "vaccine.doseSecond");
  });
});

describe("babyVaccineHasMorePages", () => {
  it("is true only when nextCursor is present", () => {
    assert.equal(babyVaccineHasMorePages("c1"), true);
    assert.equal(babyVaccineHasMorePages(null), false);
    assert.equal(babyVaccineHasMorePages(undefined), false);
    assert.equal(babyVaccineHasMorePages(""), false);
  });
});

describe("babyVaccineListCopy", () => {
  it("maps ready / partial / partialCapped", () => {
    assert.equal(
      babyVaccineListCopy({
        entryCount: 2,
        listIncomplete: false,
        canLoadMore: false,
      }),
      "ready",
    );
    assert.equal(
      babyVaccineListCopy({
        entryCount: 2,
        listIncomplete: true,
        canLoadMore: true,
      }),
      "partial",
    );
    assert.equal(
      babyVaccineListCopy({
        entryCount: 2,
        listIncomplete: true,
        canLoadMore: false,
      }),
      "partialCapped",
    );
    assert.equal(
      babyVaccineListCopy({
        entryCount: 0,
        listIncomplete: false,
        canLoadMore: false,
      }),
      "empty",
    );
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseMajorToMinor } from "@/lib/format-money";
import { appendVndAmountSuffix } from "@/lib/vnd-amount-suffix";

describe("appendVndAmountSuffix", () => {
  it("appends thousand zeros", () => {
    assert.equal(appendVndAmountSuffix("25", "000"), "25000");
  });

  it("appends million zeros", () => {
    assert.equal(appendVndAmountSuffix("25", "000000"), "25000000");
  });

  it("strips grouping/decimal punctuation before append", () => {
    assert.equal(appendVndAmountSuffix("25.000", "000"), "25000000");
    assert.equal(appendVndAmountSuffix("25,000", "000"), "25000000");
  });

  it("returns empty for blank input", () => {
    assert.equal(appendVndAmountSuffix("", "000"), "");
    assert.equal(appendVndAmountSuffix("   ", "000"), "");
  });

  it("keeps a lone zero then appends", () => {
    assert.equal(appendVndAmountSuffix("0", "000"), "0000");
  });

  it("supports successive append", () => {
    const once = appendVndAmountSuffix("25", "000");
    assert.equal(once, "25000");
    assert.equal(appendVndAmountSuffix(once, "000"), "25000000");
  });
});

describe("money-transaction-form VND suffix wiring", () => {
  it("imports append helper and shows VND shortcut labels", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/money-transaction-form.tsx"),
      "utf8",
    );
    assert.match(src, /appendVndAmountSuffix/);
    assert.match(src, /VND amount shortcuts/);
    assert.match(src, /Tap to add zeros/);
    assert.match(src, /title="Add 000"/);
    assert.match(src, /title="Add 000\.000"/);
    assert.match(src, /appendVndAmountSuffix\(amountMajor, "000"\)/);
    assert.match(src, /appendVndAmountSuffix\(amountMajor, "000000"\)/);
  });
});

describe("VND fill parse safety", () => {
  it("plain digits parse to the intended minor amount", () => {
    assert.equal(parseMajorToMinor("25000", "VND"), 25000);
  });

  it("grouped dots are unsafe for parseMajorToMinor (why fill is plain digits)", () => {
    assert.equal(parseMajorToMinor("25.000", "VND"), 25);
  });
});

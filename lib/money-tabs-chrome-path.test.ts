import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hidesShellRailChrome,
  isInvestmentsChromePath,
  isLoansChromePath,
  isMoneyTabsChromePath,
} from "@/lib/money-tabs-chrome-path";

describe("chrome paths", () => {
  it("treats money, investments, loans, kiosk, and core routes as in-page chrome", () => {
    assert.equal(isMoneyTabsChromePath("/money"), true);
    assert.equal(isInvestmentsChromePath("/investments"), true);
    assert.equal(isInvestmentsChromePath("/investments/new"), true);
    assert.equal(isLoansChromePath("/loans"), true);
    assert.equal(isLoansChromePath("/loans/new"), true);
    assert.equal(hidesShellRailChrome("/kiosk"), true);
    assert.equal(hidesShellRailChrome("/money"), true);
    assert.equal(hidesShellRailChrome("/investments"), true);
    assert.equal(hidesShellRailChrome("/investments/instruments"), true);
    assert.equal(hidesShellRailChrome("/loans"), true);
    assert.equal(hidesShellRailChrome("/help"), true);
    assert.equal(hidesShellRailChrome("/settings"), true);
  });

});

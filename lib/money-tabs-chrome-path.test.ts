import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appNavMenuPanelForPath,
  hidesShellRailChrome,
  isInvestmentsChromePath,
  isLoansChromePath,
  isMoneyTabsChromePath,
} from "@/lib/money-tabs-chrome-path";

describe("chrome paths", () => {
  it("treats money, investments, and loans as in-page chrome", () => {
    assert.equal(isMoneyTabsChromePath("/money"), true);
    assert.equal(isInvestmentsChromePath("/investments"), true);
    assert.equal(isInvestmentsChromePath("/investments/new"), true);
    assert.equal(isLoansChromePath("/loans"), true);
    assert.equal(isLoansChromePath("/loans/new"), true);
    assert.equal(hidesShellRailChrome("/money"), true);
    assert.equal(hidesShellRailChrome("/investments"), true);
    assert.equal(hidesShellRailChrome("/investments/instruments"), true);
    assert.equal(hidesShellRailChrome("/loans"), true);
    assert.equal(hidesShellRailChrome("/help"), true);
    assert.equal(hidesShellRailChrome("/settings"), true);
  });

  it("opens the nested hamburger on the current app", () => {
    assert.equal(appNavMenuPanelForPath("/money"), "money");
    assert.equal(appNavMenuPanelForPath("/investments/new"), "investments");
    assert.equal(appNavMenuPanelForPath("/loans/insights"), "loans");
    assert.equal(appNavMenuPanelForPath("/help"), "root");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cashMoveSignedMinor,
  previewTradeResult,
  realizeNetPnl,
  signedPnlToLedger,
  tradeGrossPnlMinor,
  tradeNetPnlMinor,
} from "@/lib/investment-realized-pnl";

describe("tradeGrossPnlMinor", () => {
  it("uses lots × contract size × price diff in minor", () => {
    assert.equal(
      tradeGrossPnlMinor({
        side: "buy",
        lots: 0.01,
        contractSize: "100",
        openPrice: 3400,
        closePrice: 3410,
        currency: "USD",
      }),
      Math.round(0.01 * 100 * 10 * 100),
    );
  });

  it("inverts the price diff for sells", () => {
    assert.equal(
      tradeGrossPnlMinor({
        side: "sell",
        lots: 1,
        contractSize: "1",
        openPrice: 100,
        closePrice: 90,
        currency: "USD",
      }),
      1000,
    );
  });
});

describe("tradeNetPnlMinor", () => {
  it("subtracts close fee and open commission", () => {
    assert.equal(tradeNetPnlMinor(5000, 100, 50), 4850);
  });
});

describe("cashMoveSignedMinor", () => {
  it("nets fee off deposits and adds fee to withdrawals", () => {
    assert.equal(cashMoveSignedMinor("deposit", 10000, 250), 9750);
    assert.equal(cashMoveSignedMinor("withdraw", 10000, 250), -10250);
  });
});

describe("signedPnlToLedger", () => {
  it("maps non-negative to income", () => {
    assert.deepEqual(signedPnlToLedger(12), {
      kind: "income",
      amountMinor: 12,
    });
    assert.deepEqual(signedPnlToLedger(0), {
      kind: "income",
      amountMinor: 0,
    });
  });

  it("maps negative to expense", () => {
    assert.deepEqual(signedPnlToLedger(-40), {
      kind: "expense",
      amountMinor: 40,
    });
  });
});

describe("previewTradeResult", () => {
  it("matches signedPnlToLedger for a losing buy", () => {
    const preview = previewTradeResult({
      side: "buy",
      lots: 1,
      contractSize: "1",
      openPrice: 100,
      closePrice: 90,
      closeFeeMinor: 50,
      currency: "USD",
    });
    assert.ok(preview);
    const signed =
      tradeNetPnlMinor(
        tradeGrossPnlMinor({
          side: "buy",
          lots: 1,
          contractSize: "1",
          openPrice: 100,
          closePrice: 90,
          currency: "USD",
        }),
        50,
        0,
      );
    assert.equal(preview.signedMinor, signed);
    assert.deepEqual(
      { kind: preview.kind, amountMinor: preview.amountMinor },
      signedPnlToLedger(signed),
    );
  });

  it("returns unrounded major P&L for tiny VND quotes", () => {
    const preview = previewTradeResult({
      side: "buy",
      lots: 0.01,
      contractSize: "1",
      openPrice: 0.01,
      closePrice: 0.005,
      closeFeeMinor: 0,
      currency: "VND",
    });
    assert.ok(preview);
    assert.equal(preview.signedMinor, 0);
    assert.ok(Math.abs(preview.signedMajor - -0.00005) < 1e-12);
  });

  it("returns null when prices are incomplete", () => {
    assert.equal(
      previewTradeResult({
        side: "sell",
        lots: 1,
        contractSize: "1",
        openPrice: 0,
        closePrice: 90,
        closeFeeMinor: 0,
        currency: "USD",
      }),
      null,
    );
  });
});

describe("realizeNetPnl", () => {
  it("keeps unrounded USD major until converting to VND", () => {
    const result = realizeNetPnl({
      side: "buy",
      lots: 0.01,
      contractSize: "100",
      openPrice: 0.111,
      closePrice: 0.222,
      closeFeeMinor: 0,
      priceCurrency: "USD",
      workspaceCurrency: "VND",
      fxRate: 26113,
    });
    assert.ok(Math.abs(result.grossMajor - 0.111) < 1e-12);
    assert.equal(result.netMinor, 2899);
  });

  it("matches same-currency USD cents without FX", () => {
    const result = realizeNetPnl({
      side: "buy",
      lots: 1,
      contractSize: "1",
      openPrice: 100,
      closePrice: 110,
      closeFeeMinor: 50,
      priceCurrency: "USD",
      workspaceCurrency: "USD",
      fxRate: 1,
    });
    assert.equal(result.netMinor, 950);
  });

  it("subtracts open commission before FX", () => {
    const result = realizeNetPnl({
      side: "buy",
      lots: 1,
      contractSize: "1",
      openPrice: 100,
      closePrice: 110,
      closeFeeMinor: 0,
      openCommissionMinor: 100,
      priceCurrency: "USD",
      workspaceCurrency: "VND",
      fxRate: 25000,
    });
    assert.equal(result.netMinor, 225000);
  });
});

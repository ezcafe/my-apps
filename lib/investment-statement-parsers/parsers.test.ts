import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectStatementPlatformAndFormat,
  parseCTraderHtmlStatement,
  parseMetaTraderHtmlStatement,
  parseMetaTraderCsvStatement,
  parseBinanceCsvStatement,
  inferInstrumentKind,
} from "./index";

const SAMPLE_CTRADER_HTML = `
<!DOCTYPE html>
<html>
<head><title>cT_1177001_01-05-2026</title></head>
<body>
<table>
  <tr><td><div class="caption-style">Account Statement</div><div class="date-style">01/05/2026 - 01/06/2026</div></td>
  <td><div class="company-name-style">cTraderLiveSC1</div></td></tr>
  <tr><td>Account : <strong>1177001</strong></td></tr>
  <tr><td>Account type : <strong>CFD</strong></td></tr>
  <tr><td>Currency : <strong>USD</strong></td></tr>
</table>
<table class="dataTable">
  <tr><td class="title-style"><strong>History</strong></td></tr>
  <tr>
    <td class="cell-header">Totals</td>
    <td class="cell-header"><strong>ID</strong></td>
    <td class="cell-header"><strong>Symbol</strong></td>
    <td class="cell-header"><strong>Opening Direction</strong></td>
    <td class="cell-header"><strong>Closing Direction</strong></td>
    <td class="cell-header"><strong>Opening Time (UTC+0)</strong></td>
    <td class="cell-header"><strong>Closing Time (UTC+0)</strong></td>
    <td class="cell-header"><strong>Entry Price</strong></td>
    <td class="cell-header"><strong>Closing Price</strong></td>
    <td class="cell-header"><strong>Closing Quantity</strong></td>
    <td class="cell-header"><strong>Swap</strong></td>
    <td class="cell-header"><strong>Commission</strong></td>
    <td class="cell-header"><strong>Conversion Rate</strong></td>
    <td class="cell-header"><strong>Gross USD</strong></td>
    <td class="cell-header"><strong>Net USD</strong></td>
    <td class="cell-header"><strong>Balance USD</strong></td>
  </tr>
  <tr>
    <td class="cell-text"></td>
    <td class="cell-text">DID210457462</td>
    <td class="cell-text">GBPUSD</td>
    <td class="cell-text">BUY</td>
    <td class="cell-text">SELL</td>
    <td class="cell-text">30/04/2026 22:32:04.616</td>
    <td class="cell-text">03/05/2026 21:01:01.399</td>
    <td class="cell-text">1.36059</td>
    <td class="cell-text">1.35850</td>
    <td class="cell-text">0.05</td>
    <td class="cell-text">-0.17</td>
    <td class="cell-text">-0.40</td>
    <td class="cell-text">1</td>
    <td class="cell-text">-10.45</td>
    <td class="cell-text">-11.02</td>
    <td class="cell-text">5065.10</td>
  </tr>
  <tr>
    <td class="cell-text"></td>
    <td class="cell-text">DID210822979</td>
    <td class="cell-text">XAUUSD</td>
    <td class="cell-text">SELL</td>
    <td class="cell-text">BUY</td>
    <td class="cell-text">07/05/2026 22:53:53.346</td>
    <td class="cell-text">07/05/2026 22:54:50.156</td>
    <td class="cell-text">4685.96</td>
    <td class="cell-text">4686.54</td>
    <td class="cell-text">0.05</td>
    <td class="cell-text">0.0</td>
    <td class="cell-text">-1.40</td>
    <td class="cell-text">1</td>
    <td class="cell-text">-2.90</td>
    <td class="cell-text">-4.30</td>
    <td class="cell-text">5060.80</td>
  </tr>
</table>
<table class="dataTable">
  <tr><td class="title-style"><strong>Positions</strong></td></tr>
  <tr>
    <td class="cell-header">Totals</td>
    <td class="cell-header"><strong>ID</strong></td>
    <td class="cell-header"><strong>Created (UTC+0)</strong></td>
    <td class="cell-header"><strong>Symbol</strong></td>
    <td class="cell-header"><strong>Quantity</strong></td>
    <td class="cell-header"><strong>Volume</strong></td>
    <td class="cell-header"><strong>Direction</strong></td>
    <td class="cell-header"><strong>Entry Price</strong></td>
    <td class="cell-header"><strong>S/L</strong></td>
    <td class="cell-header"><strong>SL is guaranteed</strong></td>
    <td class="cell-header"><strong>T/P</strong></td>
    <td class="cell-header"><strong>Swap</strong></td>
    <td class="cell-header"><strong>Commissions</strong></td>
    <td class="cell-header"><strong>Gross USD</strong></td>
    <td class="cell-header"><strong>Net USD</strong></td>
  </tr>
  <tr>
    <td class="cell-text"></td>
    <td class="cell-text">PID156833202</td>
    <td class="cell-text">29/05/2026 11:49:53.529</td>
    <td class="cell-text">XAUUSD</td>
    <td class="cell-text">0.05</td>
    <td class="cell-text">XAU 5</td>
    <td class="cell-text">BUY</td>
    <td class="cell-text">4529.68</td>
    <td class="cell-text">4484.68</td>
    <td class="cell-text">No</td>
    <td class="cell-text">-</td>
    <td class="cell-text">-2.74</td>
    <td class="cell-text">-0.68</td>
    <td class="cell-text">46.92</td>
    <td class="cell-text">43.50</td>
  </tr>
</table>
</body>
</html>
`;

const SAMPLE_BINANCE_CSV = `
Date(UTC),Market,Type,Price,Amount,Total,Fee,Fee Coin
2026-05-10 14:30:00,BTCUSDT,BUY,65000.50,0.15,9750.075,9.75,USDT
2026-05-12 18:45:22,ETHUSDT,SELL,3450.20,1.20,4140.24,4.14,USDT
`;

const SAMPLE_METATRADER_CSV = `
Ticket;Open Time;Type;Size;Item;Price;S / L;T / P;Close Time;Price;Commission;Taxes;Swap;Profit
1234567;2026.05.01 10:00:00;buy;0.10;EURUSD;1.08500;1.08000;1.09000;2026.05.02 12:00:00;1.08800;-0.70;0.00;0.15;30.00
1234568;2026.05.03 11:15:00;balance;0.00;Deposit;0.00;0.00;0.00;;0.00;0.00;0.00;0.00;1000.00
`;

describe("inferInstrumentKind", () => {
  it("classifies gold/commodities correctly", () => {
    assert.equal(inferInstrumentKind("XAUUSD"), "commodities");
    assert.equal(inferInstrumentKind("XAGUSD"), "commodities");
    assert.equal(inferInstrumentKind("USOUSD"), "commodities");
  });

  it("classifies forex pairs correctly", () => {
    assert.equal(inferInstrumentKind("EURUSD"), "fx");
    assert.equal(inferInstrumentKind("GBPUSD"), "fx");
    assert.equal(inferInstrumentKind("USDJPY"), "fx");
  });

  it("classifies crypto correctly", () => {
    assert.equal(inferInstrumentKind("BTCUSDT"), "coins");
    assert.equal(inferInstrumentKind("ETHUSDT"), "coins");
  });
});

describe("parseCTraderHtmlStatement", () => {
  it("extracts account info, closed trades, and open positions", () => {
    const result = parseCTraderHtmlStatement(SAMPLE_CTRADER_HTML);

    assert.equal(result.platform, "ctrader");
    assert.equal(result.account.accountNumber, "1177001");
    assert.equal(result.account.currency, "USD");
    assert.equal(result.account.brokerOrPlatform, "cTraderLiveSC1");

    assert.equal(result.closedTrades.length, 2);
    assert.equal(result.closedTrades[0]?.externalId, "DID210457462");
    assert.equal(result.closedTrades[0]?.symbol, "GBPUSD");
    assert.equal(result.closedTrades[0]?.side, "buy");
    assert.equal(result.closedTrades[0]?.quantity, "0.05");
    assert.equal(result.closedTrades[0]?.netPnlMinor, -1102);

    assert.equal(result.closedTrades[1]?.externalId, "DID210822979");
    assert.equal(result.closedTrades[1]?.symbol, "XAUUSD");
    assert.equal(result.closedTrades[1]?.side, "sell");
    assert.equal(result.closedTrades[1]?.netPnlMinor, -430);

    assert.equal(result.openPositions.length, 1);
    assert.equal(result.openPositions[0]?.externalId, "PID156833202");
    assert.equal(result.openPositions[0]?.symbol, "XAUUSD");
    assert.equal(result.openPositions[0]?.side, "buy");
    assert.equal(result.openPositions[0]?.stopLoss, "4484.68");
  });
});

describe("parseBinanceCsvStatement", () => {
  it("parses Binance trade records", () => {
    const result = parseBinanceCsvStatement(SAMPLE_BINANCE_CSV);
    assert.equal(result.platform, "binance");
    assert.equal(result.closedTrades.length, 2);
    assert.equal(result.closedTrades[0]?.symbol, "BTCUSDT");
    assert.equal(result.closedTrades[0]?.side, "buy");
    assert.equal(result.closedTrades[0]?.quantity, "0.15");
    assert.equal(result.closedTrades[1]?.symbol, "ETHUSDT");
    assert.equal(result.closedTrades[1]?.side, "sell");
  });
});

const SAMPLE_METATRADER_HTML = `
<!DOCTYPE html>
<html>
<body>
<div>Account: 8899001</div>
<div>Name: John Doe</div>
<div>Currency: USD</div>
<table>
  <tr><td>Closed Transactions:</td></tr>
  <tr>
    <td>Ticket</td><td>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td>Close Time</td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td>
  </tr>
  <tr>
    <td>998877</td><td>2026.05.10 12:00:00</td><td>buy</td><td>0.05</td><td>XAUUSD</td><td>2350.00</td><td>0.00</td><td>0.00</td><td>2026.05.11 15:00:00</td><td>2360.00</td><td>-1.50</td><td>0.00</td><td>-0.50</td><td>50.00</td>
  </tr>
</table>
</body>
</html>
`;

describe("parseMetaTraderHtmlStatement", () => {
  it("parses MetaTrader HTML report", () => {
    const result = parseMetaTraderHtmlStatement(SAMPLE_METATRADER_HTML);
    assert.equal(result.platform, "metatrader");
    assert.equal(result.account.accountNumber, "8899001");
    assert.equal(result.closedTrades.length, 1);
    assert.equal(result.closedTrades[0]?.symbol, "XAUUSD");
    assert.equal(result.closedTrades[0]?.netPnlMinor, 5000);
  });
});

describe("parseMetaTraderCsvStatement", () => {
  it("parses MetaTrader trades and deposit", () => {
    const result = parseMetaTraderCsvStatement(SAMPLE_METATRADER_CSV);
    assert.equal(result.platform, "metatrader");
    assert.equal(result.closedTrades.length, 1);
    assert.equal(result.closedTrades[0]?.externalId, "1234567");
    assert.equal(result.closedTrades[0]?.symbol, "EURUSD");
    assert.equal(result.closedTrades[0]?.netPnlMinor, 3000);

    assert.equal(result.cashMoves.length, 1);
    assert.equal(result.cashMoves[0]?.type, "deposit");
    assert.equal(result.cashMoves[0]?.amountMinor, 100000);
  });
});

describe("detectStatementPlatformAndFormat", () => {
  it("auto-detects cTrader HTML", () => {
    const res = detectStatementPlatformAndFormat(SAMPLE_CTRADER_HTML);
    assert.equal(res.platform, "ctrader");
  });

  it("auto-detects Binance CSV", () => {
    const res = detectStatementPlatformAndFormat(SAMPLE_BINANCE_CSV);
    assert.equal(res.platform, "binance");
  });

  it("auto-detects MetaTrader CSV", () => {
    const res = detectStatementPlatformAndFormat(SAMPLE_METATRADER_CSV);
    assert.equal(res.platform, "metatrader");
  });
});

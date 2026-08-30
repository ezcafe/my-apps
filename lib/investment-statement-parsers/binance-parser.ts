import { parse } from "csv-parse/sync";
import type {
  NormalizedCashMoveRow,
  NormalizedTradeRow,
  StatementParseResult,
} from "./types";
import {
  parseMajorAmountToMinor,
  parseStatementDateTime,
} from "./utils";

export function parseBinanceCsvStatement(csvText: string): StatementParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const records = parse(csvText, {
    delimiter: [",", "\t", ";"],
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];

  const currency = "USD";
  const closedTrades: NormalizedTradeRow[] = [];
  const cashMoves: NormalizedCashMoveRow[] = [];

  if (!records || records.length < 2) {
    errors.push("CSV file is empty or missing data rows.");
    return {
      platform: "binance",
      detectedFormatName: "Binance CSV Export",
      account: { brokerOrPlatform: "Binance", currency },
      closedTrades: [],
      openPositions: [],
      cashMoves: [],
      warnings,
      errors,
      summary: {
        totalTrades: 0,
        totalPositions: 0,
        totalCashMoves: 0,
        totalNetPnlMinor: 0,
        totalCommissionsMinor: 0,
        totalSwapMinor: 0,
        currency,
      },
    };
  }

  // Find header row
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, records.length); i++) {
    const row = records[i]!.map((c) => c.toLowerCase());
    if (
      row.some(
        (c) =>
          c.includes("date") ||
          c.includes("market") ||
          c.includes("pair") ||
          c.includes("symbol") ||
          c.includes("coin"),
      )
    ) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = records[headerRowIdx]!;
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());
  const rows = records.slice(headerRowIdx + 1);

  const getCol = (cells: string[], names: string[]): string => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx !== -1 && idx < cells.length) {
        return cells[idx]?.trim() ?? "";
      }
    }
    return "";
  };

  const isFutures = headers.some((h) => h.includes("realized") || h.includes("pnl") || h.includes("contract"));
  const isDepositWithdrawal = headers.some((h) => h.includes("txid") || h.includes("address") || h.includes("network"));

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]!;
    if (cells.length < 3) continue;

    const dateRaw = getCol(cells, ["date", "time", "timestamp"]);
    if (!dateRaw) continue;
    const timeParsed = parseStatementDateTime(dateRaw);

    if (isDepositWithdrawal) {
      const coin = getCol(cells, ["coin", "asset", "currency"]);
      const amount = getCol(cells, ["amount", "change", "quantity"]);
      const status = getCol(cells, ["status"]);
      const txid = getCol(cells, ["txid", "transaction id", "order id"]);
      const typeRaw = getCol(cells, ["operation", "type", "side"]).toLowerCase();

      const isWithdraw = typeRaw.includes("withdraw") || parseMajorAmountToMinor(amount, coin) < 0;
      cashMoves.push({
        externalId: txid || `binance-transfer-${i + 1}`,
        time: timeParsed.iso,
        activityDate: timeParsed.activityDate,
        type: isWithdraw ? "withdraw" : "deposit",
        amountMinor: Math.abs(parseMajorAmountToMinor(amount, coin)),
        currency: coin || "USD",
        notes: `Binance ${isWithdraw ? "Withdrawal" : "Deposit"} ${coin} (Status: ${status || "Completed"})`,
      });
      continue;
    }

    const symbolRaw = getCol(cells, ["symbol", "market", "pair", "contract", "instrument"]);
    const sideRaw = getCol(cells, ["side", "type", "direction"]).toLowerCase();
    const price = getCol(cells, ["price", "unit price", "avg price"]);
    const amount = getCol(cells, ["executed", "amount", "quantity", "filled", "size"]);
    const fee = getCol(cells, ["fee", "commission"]);
    const feeAsset = getCol(cells, ["fee coin", "fee asset", "fee currency"]) || "USDT";
    const realizedPnl = getCol(cells, ["realized profit", "realized pnl", "profit", "pnl"]);

    if (!symbolRaw || !amount) continue;

    const symbol = symbolRaw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const side: "buy" | "sell" = sideRaw.includes("sell") ? "sell" : "buy";
    const feeMinor = parseMajorAmountToMinor(fee, feeAsset);
    const pnlMinor = realizedPnl ? parseMajorAmountToMinor(realizedPnl, "USD") : 0;

    closedTrades.push({
      externalId: getCol(cells, ["order id", "orderid", "id", "ticket"]) || `binance-trade-${i + 1}`,
      symbol,
      kind: "coins",
      side,
      openTime: timeParsed.iso,
      closeTime: timeParsed.iso,
      activityDate: timeParsed.activityDate,
      quantity: amount,
      openPrice: price || "0",
      closePrice: price || "0",
      commissionMinor: -Math.abs(feeMinor),
      swapMinor: 0,
      grossPnlMinor: pnlMinor,
      netPnlMinor: pnlMinor - Math.abs(feeMinor),
      currency: symbol.endsWith("USDT") || isFutures ? "USD" : symbol,
      notes: `Binance ${side.toUpperCase()} ${amount} ${symbol} @ ${price}`,
    });
  }

  let totalNetPnlMinor = 0;
  let totalCommissionsMinor = 0;
  for (const t of closedTrades) {
    totalNetPnlMinor += t.netPnlMinor;
    totalCommissionsMinor += t.commissionMinor;
  }

  return {
    platform: "binance",
    detectedFormatName: isFutures ? "Binance Futures Trade History" : isDepositWithdrawal ? "Binance Funds History" : "Binance Spot Trade History",
    account: {
      brokerOrPlatform: "Binance",
      currency,
    },
    closedTrades,
    openPositions: [],
    cashMoves,
    warnings,
    errors,
    summary: {
      totalTrades: closedTrades.length,
      totalPositions: 0,
      totalCashMoves: cashMoves.length,
      totalNetPnlMinor,
      totalCommissionsMinor,
      totalSwapMinor: 0,
      currency,
    },
  };
}

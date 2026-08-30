import { parse } from "csv-parse/sync";
import type {
  NormalizedCashMoveRow,
  NormalizedPositionRow,
  NormalizedTradeRow,
  StatementAccountInfo,
  StatementParseResult,
} from "./types";
import {
  cleanText,
  inferInstrumentKind,
  parseMajorAmountToMinor,
  parseStatementDateTime,
} from "./utils";

function extractTagContents(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    if (m[1] !== undefined) {
      matches.push(m[1]);
    }
  }
  return matches;
}

export function parseMetaTraderHtmlStatement(html: string): StatementParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const plainText = cleanText(html);
  const accountInfo: StatementAccountInfo = {
    brokerOrPlatform: "MetaTrader",
    currency: "USD",
  };

  const accMatch = plainText.match(/Account\s*:\s*(\S+)/i) || plainText.match(/Login\s*:\s*(\S+)/i);
  if (accMatch) accountInfo.accountNumber = accMatch[1];

  const nameMatch = plainText.match(/Name\s*:\s*([^,\n\r]+)/i);
  if (nameMatch) accountInfo.holderName = nameMatch[1]?.trim();

  const currMatch = plainText.match(/Currency\s*:\s*([A-Za-z]{3})/i);
  if (currMatch) accountInfo.currency = currMatch[1].toUpperCase();

  const companyMatch = plainText.match(/Company\s*:\s*([^,\n\r]+)/i);
  if (companyMatch) accountInfo.brokerOrPlatform = companyMatch[1]?.trim() ?? "MetaTrader";

  const currency = accountInfo.currency ?? "USD";
  const closedTrades: NormalizedTradeRow[] = [];
  const openPositions: NormalizedPositionRow[] = [];
  const cashMoves: NormalizedCashMoveRow[] = [];

  const trBlocks = extractTagContents(html, "tr");
  let currentSection: "none" | "closed" | "open" | "orders" | "summary" = "none";

  for (const tr of trBlocks) {
    const text = cleanText(tr);
    const lower = text.toLowerCase();

    if (lower.includes("closed transactions") || lower.includes("closed trades") || lower.includes("deals")) {
      currentSection = "closed";
      continue;
    }
    if (lower.includes("open trades") || lower.includes("open positions")) {
      currentSection = "open";
      continue;
    }
    if (lower.includes("working orders") || lower.includes("orders")) {
      currentSection = "orders";
      continue;
    }
    if (lower.includes("summary") || lower.includes("details")) {
      currentSection = "summary";
      continue;
    }

    const cells = extractTagContents(tr, "td").concat(extractTagContents(tr, "th")).map(cleanText);
    if (cells.length < 5) continue;

    if (cells.some((c) => c.toLowerCase() === "ticket" || c.toLowerCase() === "item" || c.toLowerCase() === "symbol")) {
      continue;
    }

    if (currentSection === "closed") {
      // Columns typical: Ticket, Open Time, Type, Size, Item/Symbol, Price, S/L, T/P, Close Time, Price, Commission, Taxes, Swap, Profit
      // Or deposits: Ticket, Time, Type (balance), Item (deposit/withdrawal), Price (0), ..., Profit (amount)
      const ticket = cells[0] ?? "";
      const openTimeRaw = cells[1] ?? "";
      const typeRaw = (cells[2] ?? "").toLowerCase();

      if (!ticket || !typeRaw) continue;

      if (typeRaw.includes("balance") || typeRaw.includes("deposit") || typeRaw.includes("credit") || typeRaw.includes("withdraw")) {
        // Cash transaction
        const amountRaw = cells[cells.length - 1] ?? "0";
        const timeParsed = parseStatementDateTime(openTimeRaw);
        const isWithdraw = parseMajorAmountToMinor(amountRaw, currency) < 0 || typeRaw.includes("withdraw");
        cashMoves.push({
          externalId: ticket,
          time: timeParsed.iso,
          activityDate: timeParsed.activityDate,
          type: isWithdraw ? "withdraw" : "deposit",
          amountMinor: Math.abs(parseMajorAmountToMinor(amountRaw, currency)),
          currency,
          notes: `MetaTrader ${typeRaw} ${ticket}`,
        });
        continue;
      }

      const size = cells[3] ?? "";
      const symbol = cells[4] ?? "";
      const openPrice = cells[5] ?? "";
      const sl = cells[6] === "0.00" || cells[6] === "0" ? null : cells[6];
      const tp = cells[7] === "0.00" || cells[7] === "0" ? null : cells[7];
      const closeTimeRaw = cells[8] ?? "";
      const closePrice = cells[9] ?? "";
      const commission = cells[10] ?? "0";
      const swap = cells[12] ?? "0";
      const profit = cells[13] ?? cells[cells.length - 1] ?? "0";

      if (!symbol || !openPrice || !closePrice) continue;

      const openParsed = parseStatementDateTime(openTimeRaw);
      const closeParsed = parseStatementDateTime(closeTimeRaw);
      const kind = inferInstrumentKind(symbol);
      const side: "buy" | "sell" = typeRaw.includes("sell") ? "sell" : "buy";
      const commMinor = parseMajorAmountToMinor(commission, currency);
      const swapMinor = parseMajorAmountToMinor(swap, currency);
      const netPnlMinor = parseMajorAmountToMinor(profit, currency);

      closedTrades.push({
        externalId: ticket,
        symbol,
        kind,
        side,
        openTime: openParsed.iso,
        closeTime: closeParsed.iso,
        activityDate: closeParsed.activityDate,
        quantity: size,
        openPrice,
        closePrice,
        stopLoss: sl,
        takeProfit: tp,
        commissionMinor: commMinor,
        swapMinor,
        grossPnlMinor: netPnlMinor - commMinor - swapMinor,
        netPnlMinor,
        currency,
        notes: `MetaTrader ${ticket} ${typeRaw} ${size} ${symbol}`,
      });
    } else if (currentSection === "open") {
      const ticket = cells[0] ?? "";
      const openTimeRaw = cells[1] ?? "";
      const typeRaw = (cells[2] ?? "").toLowerCase();
      const size = cells[3] ?? "";
      const symbol = cells[4] ?? "";
      const openPrice = cells[5] ?? "";
      const sl = cells[6] === "0.00" || cells[6] === "0" ? null : cells[6];
      const tp = cells[7] === "0.00" || cells[7] === "0" ? null : cells[7];
      const commission = cells[9] ?? "0";
      const swap = cells[11] ?? "0";

      if (!ticket || !symbol || !openPrice) continue;

      const openParsed = parseStatementDateTime(openTimeRaw);
      const kind = inferInstrumentKind(symbol);
      const side: "buy" | "sell" = typeRaw.includes("sell") ? "sell" : "buy";

      openPositions.push({
        externalId: ticket,
        symbol,
        kind,
        side,
        openTime: openParsed.iso,
        activityDate: openParsed.activityDate,
        quantity: size,
        openPrice,
        stopLoss: sl,
        takeProfit: tp,
        commissionMinor: parseMajorAmountToMinor(commission, currency),
        swapMinor: parseMajorAmountToMinor(swap, currency),
        currency,
        notes: `MetaTrader open position ${ticket} ${typeRaw} ${size} ${symbol}`,
      });
    }
  }

  let totalNetPnlMinor = 0;
  let totalCommissionsMinor = 0;
  let totalSwapMinor = 0;

  for (const t of closedTrades) {
    totalNetPnlMinor += t.netPnlMinor;
    totalCommissionsMinor += t.commissionMinor;
    totalSwapMinor += t.swapMinor;
  }

  return {
    platform: "metatrader",
    detectedFormatName: `MetaTrader Statement (${accountInfo.brokerOrPlatform})`,
    account: accountInfo,
    closedTrades,
    openPositions,
    cashMoves,
    warnings,
    errors,
    summary: {
      totalTrades: closedTrades.length,
      totalPositions: openPositions.length,
      totalCashMoves: cashMoves.length,
      totalNetPnlMinor,
      totalCommissionsMinor,
      totalSwapMinor,
      currency,
    },
  };
}

export function parseMetaTraderCsvStatement(csvText: string): StatementParseResult {
  const records = parse(csvText, {
    delimiter: [";", ",", "\t"],
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];

  const warnings: string[] = [];
  const errors: string[] = [];
  const currency = "USD";
  const closedTrades: NormalizedTradeRow[] = [];
  const openPositions: NormalizedPositionRow[] = [];
  const cashMoves: NormalizedCashMoveRow[] = [];

  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, records.length); i++) {
    const row = records[i]!.map((c) => c.toLowerCase());
    if (row.some((c) => c.includes("ticket") || c.includes("symbol") || c.includes("item"))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    errors.push("Could not find MetaTrader CSV header row.");
    return {
      platform: "metatrader",
      detectedFormatName: "MetaTrader CSV Export",
      account: { brokerOrPlatform: "MetaTrader", currency },
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

  const rows = records.slice(headerIndex + 1);
  for (const cells of rows) {
    if (cells.length < 6) continue;
    const ticket = cells[0] ?? "";
    const openTimeRaw = cells[1] ?? "";
    const typeRaw = (cells[2] ?? "").toLowerCase();

    if (typeRaw.includes("balance") || typeRaw.includes("deposit") || typeRaw.includes("withdraw")) {
      const amountRaw = cells[cells.length - 1] ?? "0";
      const timeParsed = parseStatementDateTime(openTimeRaw);
      const isWithdraw = parseMajorAmountToMinor(amountRaw, currency) < 0 || typeRaw.includes("withdraw");
      cashMoves.push({
        externalId: ticket,
        time: timeParsed.iso,
        activityDate: timeParsed.activityDate,
        type: isWithdraw ? "withdraw" : "deposit",
        amountMinor: Math.abs(parseMajorAmountToMinor(amountRaw, currency)),
        currency,
        notes: `MetaTrader ${typeRaw} ${ticket}`,
      });
      continue;
    }

    const size = cells[3] ?? "";
    const symbol = cells[4] ?? "";
    const openPrice = cells[5] ?? "";
    const sl = cells[6] && cells[6] !== "0" ? cells[6] : null;
    const tp = cells[7] && cells[7] !== "0" ? cells[7] : null;
    const closeTimeRaw = cells[8] ?? "";
    const closePrice = cells[9] ?? "";
    const commission = cells[10] ?? "0";
    const swap = cells[12] ?? "0";
    const profit = cells[13] ?? cells[cells.length - 1] ?? "0";

    if (!symbol || !openPrice) continue;

    const openParsed = parseStatementDateTime(openTimeRaw);
    const kind = inferInstrumentKind(symbol);
    const side: "buy" | "sell" = typeRaw.includes("sell") ? "sell" : "buy";

    if (closeTimeRaw && closePrice) {
      const closeParsed = parseStatementDateTime(closeTimeRaw);
      const commMinor = parseMajorAmountToMinor(commission, currency);
      const swapMinor = parseMajorAmountToMinor(swap, currency);
      const netPnlMinor = parseMajorAmountToMinor(profit, currency);
      closedTrades.push({
        externalId: ticket,
        symbol,
        kind,
        side,
        openTime: openParsed.iso,
        closeTime: closeParsed.iso,
        activityDate: closeParsed.activityDate,
        quantity: size,
        openPrice,
        closePrice,
        stopLoss: sl,
        takeProfit: tp,
        commissionMinor: commMinor,
        swapMinor,
        grossPnlMinor: netPnlMinor - commMinor - swapMinor,
        netPnlMinor,
        currency,
        notes: `MetaTrader ${ticket} ${typeRaw} ${size} ${symbol}`,
      });
    } else {
      openPositions.push({
        externalId: ticket,
        symbol,
        kind,
        side,
        openTime: openParsed.iso,
        activityDate: openParsed.activityDate,
        quantity: size,
        openPrice,
        stopLoss: sl,
        takeProfit: tp,
        commissionMinor: parseMajorAmountToMinor(commission, currency),
        swapMinor: parseMajorAmountToMinor(swap, currency),
        currency,
        notes: `MetaTrader open position ${ticket} ${typeRaw} ${size} ${symbol}`,
      });
    }
  }

  let totalNetPnlMinor = 0;
  let totalCommissionsMinor = 0;
  let totalSwapMinor = 0;

  for (const t of closedTrades) {
    totalNetPnlMinor += t.netPnlMinor;
    totalCommissionsMinor += t.commissionMinor;
    totalSwapMinor += t.swapMinor;
  }

  return {
    platform: "metatrader",
    detectedFormatName: "MetaTrader CSV Statement",
    account: { brokerOrPlatform: "MetaTrader", currency },
    closedTrades,
    openPositions,
    cashMoves,
    warnings,
    errors,
    summary: {
      totalTrades: closedTrades.length,
      totalPositions: openPositions.length,
      totalCashMoves: cashMoves.length,
      totalNetPnlMinor,
      totalCommissionsMinor,
      totalSwapMinor,
      currency,
    },
  };
}

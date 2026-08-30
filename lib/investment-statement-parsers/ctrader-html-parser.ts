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

export function parseCTraderHtmlStatement(html: string): StatementParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Account info extraction
  const plainText = cleanText(html);
  const accountInfo: StatementAccountInfo = {
    brokerOrPlatform: "cTrader",
    currency: "USD",
  };

  const accountMatch = plainText.match(/Account\s*:\s*(\S+)/i);
  if (accountMatch) accountInfo.accountNumber = accountMatch[1];

  const typeMatch = plainText.match(/Account\s*type\s*:\s*([A-Za-z0-9]+)/i);
  if (typeMatch) accountInfo.accountType = typeMatch[1];

  const currMatch = plainText.match(/Currency\s*:\s*([A-Za-z]{3})/i);
  if (currMatch) accountInfo.currency = currMatch[1].toUpperCase();

  const companyMatch = html.match(
    /<div class="company-name-style"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (companyMatch) {
    accountInfo.brokerOrPlatform = cleanText(companyMatch[1] ?? "cTrader");
  }

  const dateRangeMatch = html.match(
    /<div class="date-style"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (dateRangeMatch) {
    const rangeText = cleanText(dateRangeMatch[1] ?? "");
    const parts = rangeText.split(/[-–—]/).map((p) => p.trim());
    if (parts[0]) {
      const parsedStart = parseStatementDateTime(parts[0]);
      accountInfo.periodStart = parsedStart.activityDate;
    }
    if (parts[1]) {
      const parsedEnd = parseStatementDateTime(parts[1]);
      accountInfo.periodEnd = parsedEnd.activityDate;
    }
  }

  const currency = accountInfo.currency ?? "USD";

  const closedTrades: NormalizedTradeRow[] = [];
  const openPositions: NormalizedPositionRow[] = [];
  const cashMoves: NormalizedCashMoveRow[] = [];

  // 2. Parse tables with class="dataTable"
  const tableRegex = /<table class="dataTable"[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1] ?? "";
    const titleMatch = tableHtml.match(
      /<td[^>]*class="title-style"[^>]*>([\s\S]*?)<\/td>/i,
    );
    const title = titleMatch ? cleanText(titleMatch[1] ?? "") : "";

    const trBlocks = extractTagContents(tableHtml, "tr");

    if (title.toLowerCase().includes("history")) {
      // Parse History Table
      let headers: string[] = [];
      for (const tr of trBlocks) {
        if (tr.includes('class="title-style"') || tr.includes('class="totals-title"')) {
          continue;
        }

        const thCells = extractTagContents(tr, "td");
        const cellTexts = thCells.map(cleanText);

        if (cellTexts.some((c) => c.toLowerCase() === "symbol")) {
          // Found header row
          headers = cellTexts.map((c) => c.toLowerCase());
          continue;
        }

        if (headers.length === 0) continue;

        // Map row by headers
        const rowMap: Record<string, string> = {};
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          if (header && i < cellTexts.length) {
            rowMap[header] = cellTexts[i] ?? "";
          }
        }

        const id = rowMap["id"] ?? "";
        const symbol = rowMap["symbol"] ?? "";
        const openDirection = (rowMap["opening direction"] ?? "BUY").toUpperCase();
        const openTimeRaw = rowMap["opening time (utc+0)"] ?? "";
        const closeTimeRaw = rowMap["closing time (utc+0)"] ?? "";
        const entryPrice = rowMap["entry price"] ?? "";
        const closingPrice = rowMap["closing price"] ?? "";
        const quantity = rowMap["closing quantity"] ?? "";
        const swap = rowMap["swap"] ?? "0";
        const commission = rowMap["commission"] ?? "0";
        const grossPnl = rowMap["gross usd"] ?? rowMap[`gross ${currency.toLowerCase()}`] ?? "0";
        const netPnl = rowMap["net usd"] ?? rowMap[`net ${currency.toLowerCase()}`] ?? "0";

        if (!symbol || !id) continue;

        const openParsed = parseStatementDateTime(openTimeRaw);
        const closeParsed = parseStatementDateTime(closeTimeRaw);
        const kind = inferInstrumentKind(symbol);
        const side: "buy" | "sell" = openDirection.includes("SELL") ? "sell" : "buy";

        closedTrades.push({
          externalId: id,
          symbol,
          kind,
          side,
          openTime: openParsed.iso,
          closeTime: closeParsed.iso,
          activityDate: closeParsed.activityDate,
          quantity,
          openPrice: entryPrice,
          closePrice: closingPrice,
          commissionMinor: parseMajorAmountToMinor(commission, currency),
          swapMinor: parseMajorAmountToMinor(swap, currency),
          grossPnlMinor: parseMajorAmountToMinor(grossPnl, currency),
          netPnlMinor: parseMajorAmountToMinor(netPnl, currency),
          currency,
          notes: `cTrader ${id} ${openDirection} ${quantity} ${symbol}`,
        });
      }
    } else if (title.toLowerCase().includes("positions")) {
      // Parse Positions Table (Open)
      let headers: string[] = [];
      for (const tr of trBlocks) {
        if (tr.includes('class="title-style"') || tr.includes('class="totals-title"')) {
          continue;
        }

        const thCells = extractTagContents(tr, "td");
        const cellTexts = thCells.map(cleanText);

        if (cellTexts.some((c) => c.toLowerCase() === "symbol")) {
          headers = cellTexts.map((c) => c.toLowerCase());
          continue;
        }

        if (headers.length === 0) continue;

        const rowMap: Record<string, string> = {};
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          if (header && i < cellTexts.length) {
            rowMap[header] = cellTexts[i] ?? "";
          }
        }

        const id = rowMap["id"] ?? "";
        const symbol = rowMap["symbol"] ?? "";
        const createdRaw = rowMap["created (utc+0)"] ?? "";
        const direction = (rowMap["direction"] ?? "BUY").toUpperCase();
        const entryPrice = rowMap["entry price"] ?? "";
        const quantity = rowMap["quantity"] ?? "";
        const sl = rowMap["s/l"] === "-" ? null : rowMap["s/l"];
        const tp = rowMap["t/p"] === "-" ? null : rowMap["t/p"];
        const swap = rowMap["swap"] ?? "0";
        const commissions = rowMap["commissions"] ?? "0";

        if (!symbol || !id || cellTexts.join(" ").includes("- No Positions -")) continue;

        const createdParsed = parseStatementDateTime(createdRaw);
        const kind = inferInstrumentKind(symbol);
        const side: "buy" | "sell" = direction.includes("SELL") ? "sell" : "buy";

        openPositions.push({
          externalId: id,
          symbol,
          kind,
          side,
          openTime: createdParsed.iso,
          activityDate: createdParsed.activityDate,
          quantity,
          openPrice: entryPrice,
          stopLoss: sl,
          takeProfit: tp,
          commissionMinor: parseMajorAmountToMinor(commissions, currency),
          swapMinor: parseMajorAmountToMinor(swap, currency),
          currency,
          notes: `cTrader open position ${id} ${direction} ${quantity} ${symbol}`,
        });
      }
    } else if (title.toLowerCase().includes("transactions")) {
      // Parse Transactions Table (Cash movements)
      let headers: string[] = [];
      for (const tr of trBlocks) {
        if (tr.includes('class="title-style"') || tr.includes('class="totals-title"')) {
          continue;
        }

        const thCells = extractTagContents(tr, "td");
        const cellTexts = thCells.map(cleanText);

        if (cellTexts.some((c) => c.toLowerCase() === "type" || c.toLowerCase() === "id")) {
          headers = cellTexts.map((c) => c.toLowerCase());
          continue;
        }

        if (headers.length === 0) continue;
        if (cellTexts.join(" ").includes("- No Transactions -")) continue;

        const rowMap: Record<string, string> = {};
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          if (header && i < cellTexts.length) {
            rowMap[header] = cellTexts[i] ?? "";
          }
        }

        const id = rowMap["id"] ?? "";
        const timeRaw = rowMap["time (utc+0)"] ?? "";
        const typeRaw = (rowMap["type"] ?? "").toLowerCase();
        const amountRaw = rowMap["amount usd"] ?? rowMap[`amount ${currency.toLowerCase()}`] ?? "0";
        const note = rowMap["note"] ?? "";

        if (!id && !timeRaw) continue;

        const timeParsed = parseStatementDateTime(timeRaw);
        let moveType: "deposit" | "withdraw" | "fee" | "interest" | "other" = "other";
        if (typeRaw.includes("deposit")) moveType = "deposit";
        else if (typeRaw.includes("withdraw")) moveType = "withdraw";
        else if (typeRaw.includes("fee") || typeRaw.includes("commission")) moveType = "fee";
        else if (typeRaw.includes("interest") || typeRaw.includes("swap") || typeRaw.includes("dividend")) moveType = "interest";

        cashMoves.push({
          externalId: id || undefined,
          time: timeParsed.iso,
          activityDate: timeParsed.activityDate,
          type: moveType,
          amountMinor: parseMajorAmountToMinor(amountRaw, currency),
          currency,
          notes: note || `cTrader transaction ${typeRaw} ${id}`,
        });
      }
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
    platform: "ctrader",
    detectedFormatName: `cTrader Statement (${accountInfo.brokerOrPlatform || "cTrader"})`,
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

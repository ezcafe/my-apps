import { parseCTraderHtmlStatement } from "./ctrader-html-parser";
import {
  parseMetaTraderCsvStatement,
  parseMetaTraderHtmlStatement,
} from "./metatrader-parser";
import { parseBinanceCsvStatement } from "./binance-parser";
import type { StatementParseResult, StatementPlatform } from "./types";

export * from "./types";
export * from "./utils";
export * from "./ctrader-html-parser";
export * from "./metatrader-parser";
export * from "./binance-parser";

export function detectStatementPlatformAndFormat(
  content: string,
  preferredPlatform?: StatementPlatform,
): StatementParseResult {
  const trimmed = content.trim();
  const isHtml = /<!DOCTYPE|<html|<table/i.test(trimmed);

  if (preferredPlatform === "ctrader") {
    return parseCTraderHtmlStatement(trimmed);
  }

  if (preferredPlatform === "binance") {
    return parseBinanceCsvStatement(trimmed);
  }

  if (preferredPlatform === "metatrader") {
    return isHtml
      ? parseMetaTraderHtmlStatement(trimmed)
      : parseMetaTraderCsvStatement(trimmed);
  }

  if (isHtml) {
    if (isCTraderHtml(trimmed)) {
      return parseCTraderHtmlStatement(trimmed);
    }
    return parseMetaTraderHtmlStatement(trimmed);
  }

  // Non-HTML, auto-detect
  if (isBinanceCsv(trimmed)) {
    return parseBinanceCsvStatement(trimmed);
  }

  if (isMetaTraderCsv(trimmed)) {
    return parseMetaTraderCsvStatement(trimmed);
  }

  // Generic/fallback to Binance or MT CSV
  try {
    return parseBinanceCsvStatement(trimmed);
  } catch {
    return parseMetaTraderCsvStatement(trimmed);
  }
}

function isCTraderHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("ctrader") ||
    lower.includes("opening direction") ||
    lower.includes("closing direction") ||
    (lower.includes("account statement") && lower.includes("closing quantity"))
  );
}

function isMetaTraderHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("metatrader") ||
    lower.includes("closed transactions:") ||
    lower.includes("open trades:") ||
    lower.includes("metaquotes")
  );
}

function isBinanceCsv(csv: string): boolean {
  const lower = csv.slice(0, 2000).toLowerCase();
  return (
    lower.includes("binance") ||
    lower.includes("fee coin") ||
    lower.includes("fee asset") ||
    lower.includes("realized profit") ||
    (lower.includes("market") && lower.includes("executed")) ||
    (lower.includes("pair") && lower.includes("fee"))
  );
}

function isMetaTraderCsv(csv: string): boolean {
  const lower = csv.slice(0, 2000).toLowerCase();
  return (
    lower.includes("ticket") &&
    (lower.includes("open time") || lower.includes("close time")) &&
    lower.includes("swap")
  );
}

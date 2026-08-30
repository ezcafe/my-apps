import type { InferredInstrumentKind } from "./types";

const COMMODITY_SYMBOLS = new Set([
  "XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD",
  "XAUEUR", "XAGEUR", "XAUAUD",
  "GOLD", "SILVER", "OIL", "BRENT", "WTI", "NATGAS",
  "USOUSD", "UKOUSD", "NGAS", "COPPER", "COFFEE", "SUGAR", "WHEAT", "CORN",
]);

const CRYPTO_BASES = new Set([
  "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "DOT", "AVAX", "MATIC",
  "LINK", "LTC", "BCH", "UNI", "NEAR", "APT", "ATOM", "FIL", "ARB", "OP",
]);

export function inferInstrumentKind(symbol: string): InferredInstrumentKind {
  const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (COMMODITY_SYMBOLS.has(clean) || clean.startsWith("XAU") || clean.startsWith("XAG")) {
    return "commodities";
  }

  if (
    clean.endsWith("USDT") ||
    clean.endsWith("BUSD") ||
    clean.endsWith("USDC") ||
    clean.endsWith("FDUSD") ||
    CRYPTO_BASES.has(clean)
  ) {
    return "coins";
  }

  // Forex standard 6-char currencies (e.g. EURUSD, GBPJPY, AUDCAD)
  const isSixCharForex =
    clean.length === 6 &&
    /^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF|CNH|HKD|SGD|SEK|NOK|MXN|ZAR|TRY|PLN|CZK|HUF|ILS|THB|DKK){2}$/.test(
      clean,
    );
  if (isSixCharForex) {
    return "fx";
  }

  // Extended forex with prefix/suffix (e.g., EURUSD.pro, EURUSD_i)
  const forexBase = clean.slice(0, 6);
  if (
    clean.length > 6 &&
    /^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF|CNH|HKD|SGD|SEK|NOK|MXN|ZAR|TRY|PLN|CZK|HUF|ILS|THB|DKK){2}$/.test(
      forexBase,
    )
  ) {
    return "fx";
  }

  return "stocks";
}

export function defaultContractSizeForSymbol(
  symbol: string,
  kind: InferredInstrumentKind,
): string {
  const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.startsWith("XAU") || clean === "GOLD") return "100";
  if (clean.startsWith("XAG") || clean === "SILVER") return "5000";
  if (clean.startsWith("USO") || clean === "OIL" || clean === "WTI") return "1000";
  if (clean.startsWith("UKO") || clean === "BRENT") return "1000";
  if (kind === "fx") return "100000";
  return "1";
}

/**
 * Parse major float/number string to minor integer (cents, 2 decimal places default).
 */
export function parseMajorAmountToMinor(
  value: string | number | null | undefined,
  _currency = "USD",
): number {
  if (value == null) return 0;
  const str = String(value).trim().replace(/,/g, "");
  const num = Number.parseFloat(str);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Parses date string like "30/04/2026 22:32:04.616", "2026-04-30 22:32:04", "2026.04.30 22:32:04"
 * into ISO format and YYYY-MM-DD activityDate.
 */
export function parseStatementDateTime(raw: string): {
  iso: string;
  activityDate: string;
} {
  const clean = raw.trim();
  if (!clean) {
    const now = new Date();
    return {
      iso: now.toISOString(),
      activityDate: now.toISOString().slice(0, 10),
    };
  }

  // Format: DD/MM/YYYY HH:mm:ss[.SSS] (cTrader format)
  const ddmmyyyy = clean.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?)?/,
  );
  if (ddmmyyyy) {
    const [, day, month, year, h = "00", m = "00", s = "00"] = ddmmyyyy;
    const yyyy = year!;
    const mm = month!.padStart(2, "0");
    const dd = day!.padStart(2, "0");
    const hh = h.padStart(2, "0");
    const min = m.padStart(2, "0");
    const sec = s.padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000Z`;
    return { iso, activityDate: `${yyyy}-${mm}-${dd}` };
  }

  // Format: YYYY.MM.DD HH:mm:ss (MetaTrader format)
  const yyyymmddDot = clean.match(
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (yyyymmddDot) {
    const [, year, month, day, h = "00", m = "00", s = "00"] = yyyymmddDot;
    const yyyy = year!;
    const mm = month!.padStart(2, "0");
    const dd = day!.padStart(2, "0");
    const hh = h.padStart(2, "0");
    const min = m.padStart(2, "0");
    const sec = s.padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000Z`;
    return { iso, activityDate: `${yyyy}-${mm}-${dd}` };
  }

  // Format: YYYY-MM-DD [HH:mm:ss] (Binance / ISO)
  const isoMatch = clean.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (isoMatch) {
    const [, year, month, day, h = "00", m = "00", s = "00"] = isoMatch;
    const yyyy = year!;
    const mm = month!.padStart(2, "0");
    const dd = day!.padStart(2, "0");
    const hh = h.padStart(2, "0");
    const min = m.padStart(2, "0");
    const sec = s.padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000Z`;
    return { iso, activityDate: `${yyyy}-${mm}-${dd}` };
  }

  // Fallback to standard Date parse
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      iso: parsed.toISOString(),
      activityDate: parsed.toISOString().slice(0, 10),
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  return { iso: `${today}T00:00:00.000Z`, activityDate: today };
}

export function cleanText(htmlOrText: string): string {
  return htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

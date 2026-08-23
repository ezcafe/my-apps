import { getCurrencyFractionDigits } from "@/lib/format-money";

export const PRICE_CURRENCIES = ["USD", "VND", "EUR", "GBP", "JPY"] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

export function isPriceCurrency(value: string): value is PriceCurrency {
  return (PRICE_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function yahooFxSymbol(from: string, to: string): string {
  return `${from.trim().toUpperCase()}${to.trim().toUpperCase()}=X`;
}

/**
 * Convert signed major units. `rateToPerFrom` is units of `toCurrency` per 1 unit of `fromCurrency`.
 */
export function convertSignedMajorToMinor(input: {
  fromMajor: number;
  fromCurrency: string;
  toCurrency: string;
  rateToPerFrom: number;
}): number {
  const from = input.fromCurrency.trim().toUpperCase();
  const to = input.toCurrency.trim().toUpperCase();
  const toScale = 10 ** getCurrencyFractionDigits(to);
  if (!Number.isFinite(input.fromMajor)) {
    throw new Error("Invalid amount");
  }
  if (from === to) {
    const n = Math.round(input.fromMajor * toScale);
    return n === 0 ? 0 : n;
  }
  if (!Number.isFinite(input.rateToPerFrom) || input.rateToPerFrom <= 0) {
    throw new Error("Invalid FX rate");
  }
  const converted = Math.round(input.fromMajor * input.rateToPerFrom * toScale);
  return converted === 0 ? 0 : converted;
}

/**
 * Convert signed minor units. `rateToPerFrom` is units of `toCurrency` per 1 unit of `fromCurrency`.
 */
export function convertSignedMinor(input: {
  fromMinor: number;
  fromCurrency: string;
  toCurrency: string;
  rateToPerFrom: number;
}): number {
  const from = input.fromCurrency.trim().toUpperCase();
  const to = input.toCurrency.trim().toUpperCase();
  if (from === to) return Math.round(input.fromMinor);
  if (!Number.isFinite(input.rateToPerFrom) || input.rateToPerFrom <= 0) {
    throw new Error("Invalid FX rate");
  }
  const fromScale = 10 ** getCurrencyFractionDigits(from);
  const toScale = 10 ** getCurrencyFractionDigits(to);
  const major = input.fromMinor / fromScale;
  return Math.round(major * input.rateToPerFrom * toScale);
}

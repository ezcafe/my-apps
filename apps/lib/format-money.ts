export function getCurrencyFractionDigits(currency: string): number {
  return currency.toUpperCase() === "VND" ? 0 : 2;
}

export function formatMinor(minor: number, currency = "USD") {
  const fractionDigits = getCurrencyFractionDigits(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(minor / 100);
  } catch {
    return (minor / 100).toFixed(fractionDigits);
  }
}

export function parseMajorToMinor(value: string, currency = "USD"): number | null {
  const fractionDigits = getCurrencyFractionDigits(currency);
  const n = Number.parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  if (fractionDigits === 0) return Math.round(n) * 100;
  return Math.round(n * 100);
}

export function minorToMajorInput(minor: number, currency = "USD"): string {
  const fractionDigits = getCurrencyFractionDigits(currency);
  return (minor / 100).toFixed(fractionDigits);
}

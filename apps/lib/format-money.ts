const VND_SYMBOL = "\u20AB"; // ₫

/** Symbol for amount input leading add-on (not full formatted money). */
export function getCurrencySymbol(currency: string): string {
  const code = currency.toUpperCase();
  if (code === "VND") return VND_SYMBOL;
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    if (sym?.value && sym.value.length <= 3) return sym.value;
  } catch {
    /* fall through */
  }
  return "$";
}

export function getCurrencyFractionDigits(currency: string): number {
  return currency.toUpperCase() === "VND" ? 0 : 2;
}

export function formatMinor(minor: number, currency = "USD") {
  const code = currency.toUpperCase();
  const fractionDigits = getCurrencyFractionDigits(currency);
  const major = minor / 100;

  if (code === "VND") {
    try {
      const num = new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(major);
      return `${num}${VND_SYMBOL}`;
    } catch {
      return `${major.toFixed(fractionDigits)}${VND_SYMBOL}`;
    }
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(major);
  } catch {
    const num = major.toFixed(fractionDigits);
    return `${code} ${num}`;
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

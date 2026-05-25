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
  const scale = 10 ** fractionDigits;
  const major = minor / scale;
  let output: string;

  if (code === "VND") {
    try {
      const num = new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(major);
      output = `${num}${VND_SYMBOL}`;
    } catch {
      output = `${major.toFixed(fractionDigits)}${VND_SYMBOL}`;
    }
  } else {
    try {
      output = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(major);
    } catch {
      const num = major.toFixed(fractionDigits);
      output = `${code} ${num}`;
    }
  }

  return output;
}

export function parseMajorToMinor(value: string, currency = "USD"): number | null {
  const fractionDigits = getCurrencyFractionDigits(currency);
  const scale = 10 ** fractionDigits;
  const n = Number.parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const minor = Math.round(n * scale);
  return minor;
}

export function minorToMajorInput(minor: number, currency = "USD"): string {
  const fractionDigits = getCurrencyFractionDigits(currency);
  const scale = 10 ** fractionDigits;
  const output = (minor / scale).toFixed(fractionDigits);
  return output;
}

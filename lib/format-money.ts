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

/** Leading/trailing addons for “$1 = [rate] ₫” FX inputs. */
export function fxRateInputAddons(
  fromCurrency: string,
  toCurrency: string,
): { leading: string; trailing: string } {
  return {
    leading: `${getCurrencySymbol(fromCurrency)}1 =`,
    trailing: getCurrencySymbol(toCurrency),
  };
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

/** Formats minor units into compact currency strings (e.g. $1.5M, 150M₫, $12.5k). */
export function formatCompactMinor(minor: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  const fractionDigits = getCurrencyFractionDigits(currency);
  const scale = 10 ** fractionDigits;
  const major = minor / scale;
  const abs = Math.abs(major);

  if (abs < 1000) {
    return formatMinor(minor, currency);
  }

  let divisor = 1;
  let suffix = "";
  if (abs >= 1e12) {
    divisor = 1e12;
    suffix = "T";
  } else if (abs >= 1e9) {
    divisor = 1e9;
    suffix = "B";
  } else if (abs >= 1e6) {
    divisor = 1e6;
    suffix = "M";
  } else if (abs >= 1e3) {
    divisor = 1e3;
    suffix = "k";
  }

  const scaled = abs / divisor;
  const maxDigits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const numStr = new Intl.NumberFormat(code === "VND" ? "vi-VN" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(scaled);

  const sign = major < 0 ? "-" : "";

  if (code === "VND") {
    return `${sign}${numStr}${suffix} ${VND_SYMBOL}`;
  }

  const symbol = getCurrencySymbol(currency);
  return `${sign}${symbol}${numStr}${suffix}`;
}

/** Formats a percentage number into a compact string (e.g. 50.5%, 1.5k%, 150M%). */
export function formatCompactPercent(percent: number): string {
  const abs = Math.abs(percent);

  if (abs < 1000) {
    return `${percent.toFixed(1)}%`;
  }

  let divisor = 1;
  let suffix = "";
  if (abs >= 1e12) {
    divisor = 1e12;
    suffix = "T";
  } else if (abs >= 1e9) {
    divisor = 1e9;
    suffix = "B";
  } else if (abs >= 1e6) {
    divisor = 1e6;
    suffix = "M";
  } else if (abs >= 1e3) {
    divisor = 1e3;
    suffix = "k";
  }

  const scaled = abs / divisor;
  const maxDigits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const numStr = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(scaled);

  const sign = percent < 0 ? "-" : "";
  return `${sign}${numStr}${suffix}%`;
}

/** Read-only P&L preview: keep sub-unit fractions that integer minor units would round away. */
export function formatPnlMajorInput(major: number, currency = "USD"): string {
  if (!Number.isFinite(major)) return "";
  const digits = getCurrencyFractionDigits(currency);
  const abs = Math.abs(major);
  if (abs === 0) return digits === 0 ? "0" : abs.toFixed(digits);
  const maxFrac = abs < 1 / 10 ** Math.max(digits, 0) ? 8 : Math.max(digits, 2);
  return abs.toLocaleString("en-US", {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(maxFrac, digits),
  });
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

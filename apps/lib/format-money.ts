export function formatMinor(minor: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return (minor / 100).toFixed(2);
  }
}

export function parseMajorToMinor(value: string): number | null {
  const n = Number.parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

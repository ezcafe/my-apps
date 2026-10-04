export type VndAmountSuffix = "000" | "000000";

/** Append VND thousand/million zeros. Digits only — safe for parseMajorToMinor. */
export function appendVndAmountSuffix(
  majorInput: string,
  suffix: VndAmountSuffix,
): string {
  const digits = majorInput.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return `${digits}${suffix}`;
}

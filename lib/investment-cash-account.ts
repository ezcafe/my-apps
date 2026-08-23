/** Prefer an explicit override, then the instrument's saved Money account. */
export function preferredInvestmentCashAccountId(
  explicitAccountId: string | null | undefined,
  instrumentAccountId: string | null | undefined,
): string | null {
  const explicit = explicitAccountId?.trim() || null;
  if (explicit) return explicit;
  const fromInstrument = instrumentAccountId?.trim() || null;
  return fromInstrument;
}

/**
 * Schedule-stable keyset cursor for listLoansInstallments.
 * Order: installmentNumber ASC, id ASC.
 * Wire format: `${installmentNumber}:${id}` (UUID).
 * Legacy UUID-only cursors are rejected (caller restarts from first page).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LoansInstallmentKeyset = {
  installmentNumber: number;
  id: string;
};

export function encodeLoansInstallmentCursor(
  key: LoansInstallmentKeyset,
): string {
  return `${key.installmentNumber}:${key.id}`;
}

/**
 * Decode cursor. Returns null for legacy UUID-only or malformed values
 * (list restarts — do not apply a partial keyset).
 */
export function decodeLoansInstallmentCursor(
  cursor: string | null | undefined,
): LoansInstallmentKeyset | null {
  if (!cursor) return null;
  const sep = cursor.indexOf(":");
  if (sep <= 0) {
    // Legacy UUID-only cursor — reject (restart).
    return null;
  }
  const numPart = cursor.slice(0, sep);
  const idPart = cursor.slice(sep + 1);
  const installmentNumber = Number(numPart);
  if (
    !Number.isInteger(installmentNumber) ||
    installmentNumber < 1 ||
    !UUID_RE.test(idPart)
  ) {
    return null;
  }
  return { installmentNumber, id: idPart };
}

import { getCurrencyFractionDigits } from "@/lib/format-money";
import { convertSignedMajorToMinor } from "@/lib/investment-fx";
import { parseContractSize } from "@/lib/investment-contract-size";

export function parsePriceMajor(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Gross P&L in price-currency major units (unrounded). */
export function tradeGrossPnlMajor(input: {
  side: "buy" | "sell";
  lots: number;
  contractSize: string | number;
  openPrice: number;
  closePrice: number;
}): number {
  const size = parseContractSize(input.contractSize);
  const diff =
    input.side === "buy"
      ? input.closePrice - input.openPrice
      : input.openPrice - input.closePrice;
  return input.lots * size * diff;
}

/** Gross P&L in minor units before fees. */
export function tradeGrossPnlMinor(input: {
  side: "buy" | "sell";
  lots: number;
  contractSize: string | number;
  openPrice: number;
  closePrice: number;
  currency: string;
}): number {
  const scale = 10 ** getCurrencyFractionDigits(input.currency);
  return Math.round(tradeGrossPnlMajor(input) * scale);
}

export function tradeNetPnlMinor(
  grossMinor: number,
  closeFeeMinor: number,
  openCommissionMinor: number,
): number {
  return grossMinor - Math.max(0, closeFeeMinor) - Math.max(0, openCommissionMinor);
}

/** Signed cash: deposit positive, withdraw negative. */
export function cashMoveSignedMinor(
  type: "deposit" | "withdraw",
  amountMinor: number,
  feeMinor: number,
): number {
  const fee = Math.max(0, feeMinor);
  if (type === "deposit") return amountMinor - fee;
  return -(amountMinor + fee);
}

export function signedPnlToLedger(signedMinor: number): {
  kind: "income" | "expense";
  amountMinor: number;
} {
  if (signedMinor >= 0) {
    return { kind: "income", amountMinor: signedMinor };
  }
  return { kind: "expense", amountMinor: -signedMinor };
}

/** Inverse of {@link signedPnlToLedger} for journal P&L after ledger edits. */
export function ledgerToSignedPnl(
  kind: string,
  amountMinor: number,
): number {
  if (kind === "income") return amountMinor;
  if (kind === "expense") return -amountMinor;
  return 0;
}

/** Client/server preview: net signed P&L plus ledger kind/amount. */
export function previewTradeResult(input: {
  side: "buy" | "sell";
  lots: number;
  contractSize: string | number;
  openPrice: number;
  closePrice: number;
  closeFeeMinor: number;
  currency: string;
}): { signedMinor: number; signedMajor: number; kind: "income" | "expense"; amountMinor: number } | null {
  if (
    !Number.isFinite(input.lots) ||
    input.lots <= 0 ||
    !Number.isFinite(input.openPrice) ||
    input.openPrice <= 0 ||
    !Number.isFinite(input.closePrice) ||
    input.closePrice <= 0 ||
    !Number.isFinite(input.closeFeeMinor) ||
    input.closeFeeMinor < 0
  ) {
    return null;
  }
  const scale = 10 ** getCurrencyFractionDigits(input.currency);
  const signedMajor =
    tradeGrossPnlMajor({
      side: input.side,
      lots: input.lots,
      contractSize: input.contractSize,
      openPrice: input.openPrice,
      closePrice: input.closePrice,
    }) -
    input.closeFeeMinor / scale;
  const signedMinor = Math.round(signedMajor * scale);
  return { signedMinor: signedMinor === 0 ? 0 : signedMinor, signedMajor, ...signedPnlToLedger(signedMinor === 0 ? 0 : signedMinor) };
}

/** Net P&L in workspace-currency minor units. Keeps price-currency major unrounded until FX. */
export function realizeNetPnl(input: {
  side: "buy" | "sell";
  lots: number;
  contractSize: string | number;
  openPrice: number;
  closePrice: number;
  closeFeeMinor: number;
  openCommissionMinor?: number;
  priceCurrency: string;
  workspaceCurrency: string;
  fxRate: number;
}): { grossMajor: number; netMajor: number; netMinor: number } {
  const priceScale = 10 ** getCurrencyFractionDigits(input.priceCurrency);
  const grossMajor = tradeGrossPnlMajor({
    side: input.side,
    lots: input.lots,
    contractSize: input.contractSize,
    openPrice: input.openPrice,
    closePrice: input.closePrice,
  });
  const netMajor =
    grossMajor -
    Math.max(0, input.closeFeeMinor) / priceScale -
    Math.max(0, input.openCommissionMinor ?? 0) / priceScale;
  const netMinor = convertSignedMajorToMinor({
    fromMajor: netMajor,
    fromCurrency: input.priceCurrency,
    toCurrency: input.workspaceCurrency,
    rateToPerFrom: input.fxRate,
  });
  return { grossMajor, netMajor, netMinor };
}

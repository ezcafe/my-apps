export type StatementPlatform =
  | "ctrader"
  | "metatrader"
  | "binance"
  | "generic";

export type InferredInstrumentKind = "fx" | "commodities" | "coins" | "stocks";

export type NormalizedTradeRow = {
  externalId: string;
  symbol: string;
  kind: InferredInstrumentKind;
  side: "buy" | "sell";
  openTime: string;
  closeTime: string;
  activityDate: string; // YYYY-MM-DD
  quantity: string;
  openPrice: string;
  closePrice: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
  commissionMinor: number;
  swapMinor: number;
  grossPnlMinor: number;
  netPnlMinor: number;
  currency: string;
  notes?: string | null;
};

export type NormalizedPositionRow = {
  externalId: string;
  symbol: string;
  kind: InferredInstrumentKind;
  side: "buy" | "sell";
  openTime: string;
  activityDate: string; // YYYY-MM-DD
  quantity: string;
  openPrice: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
  commissionMinor: number;
  swapMinor: number;
  currency: string;
  notes?: string | null;
};

export type NormalizedCashMoveRow = {
  externalId?: string;
  time: string;
  activityDate: string; // YYYY-MM-DD
  type: "deposit" | "withdraw" | "fee" | "interest" | "other";
  amountMinor: number;
  currency: string;
  notes?: string | null;
};

export type StatementAccountInfo = {
  accountNumber?: string;
  brokerOrPlatform: string;
  accountType?: string;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  statementDate?: string;
  holderName?: string;
};

export type StatementParseResult = {
  platform: StatementPlatform;
  detectedFormatName: string;
  account: StatementAccountInfo;
  closedTrades: NormalizedTradeRow[];
  openPositions: NormalizedPositionRow[];
  cashMoves: NormalizedCashMoveRow[];
  warnings: string[];
  errors: string[];
  summary: {
    totalTrades: number;
    totalPositions: number;
    totalCashMoves: number;
    totalNetPnlMinor: number;
    totalCommissionsMinor: number;
    totalSwapMinor: number;
    currency: string;
  };
};

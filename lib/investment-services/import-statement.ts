import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  investmentInstrument,
  investmentTradeJournal,
} from "@/db/schema/investment";
import {
  moneyAccount,
  moneyTransaction,
  moneyTransactionInvestment,
} from "@/db/schema/money";
import {
  detectStatementPlatformAndFormat,
  defaultContractSizeForSymbol,
  type InferredInstrumentKind,
  type NormalizedCashMoveRow,
  type NormalizedPositionRow,
  type NormalizedTradeRow,
  type StatementParseResult,
  type StatementPlatform,
} from "@/lib/investment-statement-parsers";
import { activityDateToOccurredAt } from "@/lib/money-investment-activity";
import { signedPnlToLedger } from "@/lib/investment-realized-pnl";
import { defaultYahooSymbol } from "@/lib/investment-yahoo";

export type StatementImportPreviewResponse = {
  parseResult: StatementParseResult;
  symbolsSummary: {
    symbol: string;
    kind: string;
    exists: boolean;
    instrumentId?: string;
    contractSize: string;
    tradesCount: number;
    positionsCount: number;
  }[];
  availableAccounts: {
    id: string;
    name: string;
    currency: string;
    type: string;
  }[];
  duplicateTradeIds: string[];
  duplicatePositionIds: string[];
};

export async function previewInvestmentStatement(
  workspaceId: string,
  content: string,
  platform?: StatementPlatform,
): Promise<StatementImportPreviewResponse> {
  const parseResult = detectStatementPlatformAndFormat(content, platform);

  // 1. Fetch existing instruments in workspace
  const existingInstruments = await db
    .select({
      id: investmentInstrument.id,
      symbol: investmentInstrument.symbol,
      kind: investmentInstrument.kind,
      contractSize: investmentInstrument.contractSize,
    })
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId));

  const instrumentMap = new Map<string, typeof existingInstruments[number]>();
  for (const inst of existingInstruments) {
    instrumentMap.set(inst.symbol.toUpperCase(), inst);
  }

  // 2. Fetch available investment money accounts
  const accounts = await db
    .select({
      id: moneyAccount.id,
      name: moneyAccount.name,
      currency: moneyAccount.currency,
      type: moneyAccount.type,
    })
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, workspaceId));

  // 3. Summarize symbols used
  const symbolStats = new Map<
    string,
    {
      symbol: string;
      kind: string;
      tradesCount: number;
      positionsCount: number;
    }
  >();

  for (const t of parseResult.closedTrades) {
    const sym = t.symbol.toUpperCase();
    const cur = symbolStats.get(sym) ?? {
      symbol: sym,
      kind: t.kind,
      tradesCount: 0,
      positionsCount: 0,
    };
    cur.tradesCount++;
    symbolStats.set(sym, cur);
  }

  for (const p of parseResult.openPositions) {
    const sym = p.symbol.toUpperCase();
    const cur = symbolStats.get(sym) ?? {
      symbol: sym,
      kind: p.kind,
      tradesCount: 0,
      positionsCount: 0,
    };
    cur.positionsCount++;
    symbolStats.set(sym, cur);
  }

  const symbolsSummary = Array.from(symbolStats.values()).map((s) => {
    const existing = instrumentMap.get(s.symbol);
    return {
      symbol: s.symbol,
      kind: existing?.kind ?? s.kind,
      exists: Boolean(existing),
      instrumentId: existing?.id,
      contractSize:
        existing?.contractSize ??
        defaultContractSizeForSymbol(s.symbol, s.kind as InferredInstrumentKind),
      tradesCount: s.tradesCount,
      positionsCount: s.positionsCount,
    };
  });

  // 4. Duplicate check: find if externalIds already present in trade journal
  const existingJournalRows = await db
    .select({
      id: investmentTradeJournal.id,
      notes: investmentTradeJournal.notes,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId))
    .orderBy(desc(investmentTradeJournal.createdAt))
    .limit(5000);

  const duplicateTradeIds: string[] = [];
  const duplicatePositionIds: string[] = [];

  const existingNotesSet = new Set(
    existingJournalRows.map((r) => r.notes ?? "").filter(Boolean),
  );

  for (const t of parseResult.closedTrades) {
    if (!t.externalId) continue;
    const isDup = Array.from(existingNotesSet).some((note) =>
      new RegExp(`\\b${t.externalId}\\b`).test(note),
    );
    if (isDup) duplicateTradeIds.push(t.externalId);
  }

  for (const p of parseResult.openPositions) {
    if (!p.externalId) continue;
    const isDup = Array.from(existingNotesSet).some((note) =>
      new RegExp(`\\b${p.externalId}\\b`).test(note),
    );
    if (isDup) duplicatePositionIds.push(p.externalId);
  }

  return {
    parseResult,
    symbolsSummary,
    availableAccounts: accounts,
    duplicateTradeIds,
    duplicatePositionIds,
  };
}

export type CommitInvestmentStatementInput = {
  moneyAccountId?: string;
  autoCreateMissingInstruments?: boolean;
  skipDuplicates?: boolean;
  trades?: NormalizedTradeRow[];
  positions?: NormalizedPositionRow[];
  cashMoves?: NormalizedCashMoveRow[];
  excludedExternalIds?: string[];
};

export async function commitInvestmentStatement(
  workspaceId: string,
  userSub: string,
  input: CommitInvestmentStatementInput,
) {
  const {
    moneyAccountId: explicitAccountId,
    autoCreateMissingInstruments = true,
    skipDuplicates = true,
    trades = [],
    positions = [],
    cashMoves = [],
    excludedExternalIds = [],
  } = input;

  const excludedSet = new Set(excludedExternalIds);

  // 1. Resolve or verify default money account
  let targetAccountId = explicitAccountId;
  let targetAccountType: string | null = null;
  if (!targetAccountId) {
    const [acc] = await db
      .select({ id: moneyAccount.id, type: moneyAccount.type })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.workspaceId, workspaceId),
          eq(moneyAccount.type, "investment"),
        ),
      )
      .limit(1);
    if (acc) {
      targetAccountId = acc.id;
      targetAccountType = acc.type;
    } else {
      const [anyAcc] = await db
        .select({ id: moneyAccount.id, type: moneyAccount.type })
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, workspaceId))
        .limit(1);
      if (!anyAcc) throw new Error("No money account found in workspace.");
      targetAccountId = anyAcc.id;
      targetAccountType = anyAcc.type;
    }
  } else {
    const [acc] = await db
      .select({ type: moneyAccount.type })
      .from(moneyAccount)
      .where(and(eq(moneyAccount.id, targetAccountId), eq(moneyAccount.workspaceId, workspaceId)))
      .limit(1);
    targetAccountType = acc?.type ?? null;
  }

  // 2. Fetch or create instruments
  const allSymbols = new Set<string>();
  const symbolKindMap = new Map<string, InferredInstrumentKind>();

  for (const t of trades) {
    allSymbols.add(t.symbol.toUpperCase());
    symbolKindMap.set(t.symbol.toUpperCase(), t.kind);
  }
  for (const p of positions) {
    allSymbols.add(p.symbol.toUpperCase());
    symbolKindMap.set(p.symbol.toUpperCase(), p.kind);
  }

  const existingList = await db
    .select({
      id: investmentInstrument.id,
      symbol: investmentInstrument.symbol,
      moneyAccountId: investmentInstrument.moneyAccountId,
    })
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId));

  const instrumentBySymbol = new Map<string, string>();
  for (const item of existingList) {
    instrumentBySymbol.set(item.symbol.toUpperCase(), item.id);
  }

  let createdInstrumentsCount = 0;
  if (autoCreateMissingInstruments) {
    for (const sym of allSymbols) {
      if (!instrumentBySymbol.has(sym)) {
        const kind = symbolKindMap.get(sym) ?? "fx";
        const contractSize = defaultContractSizeForSymbol(sym, kind);
        const [inserted] = await db
          .insert(investmentInstrument)
          .values({
            workspaceId,
            symbol: sym,
            name: sym,
            kind,
            currency: "USD",
            contractSize,
            yahooSymbol: defaultYahooSymbol(kind, sym, "USD"),
            moneyAccountId: targetAccountId,
          })
          .returning({ id: investmentInstrument.id });

        if (inserted) {
          instrumentBySymbol.set(sym, inserted.id);
          createdInstrumentsCount++;
        }
      }
    }
  }

  // Duplicate check set if skipDuplicates is true
  const existingTradeExtIds = new Set<string>();
  const existingPosExtIds = new Set<string>();
  if (skipDuplicates) {
    const existingJournal = await db
      .select({ notes: investmentTradeJournal.notes, status: investmentTradeJournal.status })
      .from(investmentTradeJournal)
      .where(eq(investmentTradeJournal.workspaceId, workspaceId))
      .orderBy(desc(investmentTradeJournal.createdAt))
      .limit(5000);
    for (const j of existingJournal) {
      if (!j.notes) continue;
      const match = j.notes.match(/\b(DID\d+|PID\d+|\d+)\b/);
      if (match && match[1]) {
        if (j.status === "open") {
          existingPosExtIds.add(match[1]);
        } else {
          existingTradeExtIds.add(match[1]);
        }
      }
    }
  }

  const isTradeDuplicate = (extId: string): boolean => {
    if (!extId) return false;
    return existingTradeExtIds.has(extId);
  };

  const isPositionDuplicate = (extId: string): boolean => {
    if (!extId) return false;
    return existingPosExtIds.has(extId);
  };

  let importedTradesCount = 0;
  let importedPositionsCount = 0;
  let importedCashMovesCount = 0;

  // 4. Import closed trades
  for (const trade of trades) {
    if (excludedSet.has(trade.externalId)) continue;
    if (skipDuplicates && isTradeDuplicate(trade.externalId)) continue;

    const instrumentId = instrumentBySymbol.get(trade.symbol.toUpperCase());
    if (!instrumentId) continue;

    const net = trade.netPnlMinor;
    const ledger = signedPnlToLedger(net);
    const occurredAt = activityDateToOccurredAt(trade.activityDate);

    // Insert money transaction for realized P&L
    const [tx] = await db
      .insert(moneyTransaction)
      .values({
        workspaceId,
        accountId: targetAccountId,
        kind: ledger.kind,
        amountMinor: ledger.amountMinor,
        occurredAt,
        notes: trade.notes ?? `Trade P&L ${trade.symbol} (${trade.externalId})`,
        createdBySub: userSub,
      })
      .returning();

    if (!tx) continue;

    await db.insert(moneyTransactionInvestment).values({
      transactionId: tx.id,
      instrumentId,
      activityType: trade.side,
      quantity: "0",
      unitPriceMinor: Math.round(Number.parseFloat(trade.openPrice || "0") * 100),
      openPrice: trade.openPrice,
      stopLoss: trade.stopLoss ?? null,
      takeProfit: trade.takeProfit ?? null,
    });

    await db.insert(investmentTradeJournal).values({
      workspaceId,
      instrumentId,
      moneyAccountId: targetAccountId,
      activityType: trade.side,
      quantity: trade.quantity || "1",
      openPrice: trade.openPrice || "0",
      closePrice: trade.closePrice || "0",
      stopLoss: trade.stopLoss ?? null,
      takeProfit: trade.takeProfit ?? null,
      commissionMinor: Math.abs(trade.commissionMinor || 0),
      closeFeeMinor: Math.abs(trade.swapMinor || 0),
      activityDate: trade.activityDate,
      status: "closed",
      closedAt: occurredAt,
      realizedPnlMinor: net,
      closedTransactionId: tx.id,
      notes: trade.notes ?? `cTrader ${trade.externalId}`,
      createdBySub: userSub,
    });

    importedTradesCount++;
  }

  // 5. Import open positions
  for (const pos of positions) {
    if (excludedSet.has(pos.externalId)) continue;
    if (skipDuplicates && isPositionDuplicate(pos.externalId)) continue;

    const instrumentId = instrumentBySymbol.get(pos.symbol.toUpperCase());
    if (!instrumentId) continue;

    await db.insert(investmentTradeJournal).values({
      workspaceId,
      instrumentId,
      moneyAccountId: targetAccountId,
      activityType: pos.side,
      quantity: pos.quantity || "1",
      openPrice: pos.openPrice || "0",
      stopLoss: pos.stopLoss ?? null,
      takeProfit: pos.takeProfit ?? null,
      commissionMinor: Math.abs(pos.commissionMinor || 0),
      activityDate: pos.activityDate,
      status: "open",
      notes: pos.notes ?? `cTrader open position ${pos.externalId}`,
      createdBySub: userSub,
    });

    importedPositionsCount++;
  }

  // 6. Import cash moves (deposits/withdrawals)
  for (const move of cashMoves) {
    if (move.externalId && excludedSet.has(move.externalId)) continue;
    if (move.externalId && skipDuplicates && isTradeDuplicate(move.externalId)) continue;

    const isDeposit = move.type === "deposit";
    const occurredAt = activityDateToOccurredAt(move.activityDate);

    const [tx] = await db
      .insert(moneyTransaction)
      .values({
        workspaceId,
        accountId: targetAccountId,
        kind: isDeposit ? "income" : "expense",
        amountMinor: Math.abs(move.amountMinor),
        occurredAt,
        notes: move.notes ?? `${isDeposit ? "Deposit" : "Withdrawal"} (${move.externalId ?? ""})`,
        createdBySub: userSub,
      })
      .returning();

    if (tx) {
      importedCashMovesCount++;
    }
  }

  return {
    importedTradesCount,
    importedPositionsCount,
    importedCashMovesCount,
    createdInstrumentsCount,
  };
}

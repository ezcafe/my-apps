import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  investmentInstrument,
  investmentTradeJournal,
} from "@/db/schema/investment";
import {
  csvResponse,
  exportMaxBytes,
  exportMaxRows,
  exportTooLargeResponse,
  rowsToCsv,
} from "@/lib/export-csv";
import { buildZip, zipResponse } from "@/lib/export-zip";

export const INVESTMENT_EXPORT_MAX_ROWS = exportMaxRows(
  "INVESTMENT_EXPORT_MAX_ROWS",
  100_000,
);
export const INVESTMENT_EXPORT_MAX_BYTES = exportMaxBytes(
  "INVESTMENT_EXPORT_MAX_BYTES",
  5_242_880,
);

const INSTRUMENT_HEADERS = [
  "name",
  "kind",
  "symbol",
  "yahooSymbol",
  "currency",
  "contractSize",
  "archived",
] as const;

const JOURNAL_HEADERS = [
  "instrumentId",
  "activityType",
  "status",
  "activityDate",
  "quantity",
  "openPrice",
  "closedAt",
  "notes",
] as const;

function buildResponse(
  filename: string,
  headers: readonly string[],
  rows: Record<string, unknown>[],
) {
  if (rows.length > INVESTMENT_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${INVESTMENT_EXPORT_MAX_ROWS}).`,
    );
  }
  const csv = rowsToCsv([...headers], rows);
  const bytes = new TextEncoder().encode(csv).byteLength;
  if (bytes > INVESTMENT_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${INVESTMENT_EXPORT_MAX_BYTES}).`,
    );
  }
  return csvResponse(filename, csv);
}

/** Instruments only — does not read quote cache tables. */
export async function exportInvestmentInstruments(
  workspaceId: string,
): Promise<Response> {
  const limit = INVESTMENT_EXPORT_MAX_ROWS + 1;
  const rows = await db
    .select({
      name: investmentInstrument.name,
      kind: investmentInstrument.kind,
      symbol: investmentInstrument.symbol,
      yahooSymbol: investmentInstrument.yahooSymbol,
      currency: investmentInstrument.currency,
      contractSize: investmentInstrument.contractSize,
      archived: investmentInstrument.archived,
    })
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId))
    .limit(limit);
  return buildResponse(
    "investment-instruments.csv",
    INSTRUMENT_HEADERS,
    rows.map((r) => ({
      ...r,
      yahooSymbol: r.yahooSymbol ?? "",
      archived: Boolean(r.archived),
    })),
  );
}

/** Trade journal rows filtered by workspaceId. */
export async function exportInvestmentTradeJournal(
  workspaceId: string,
): Promise<Response> {
  const limit = INVESTMENT_EXPORT_MAX_ROWS + 1;
  const rows = await db
    .select({
      instrumentId: investmentTradeJournal.instrumentId,
      activityType: investmentTradeJournal.activityType,
      status: investmentTradeJournal.status,
      activityDate: investmentTradeJournal.activityDate,
      quantity: investmentTradeJournal.quantity,
      openPrice: investmentTradeJournal.openPrice,
      closedAt: investmentTradeJournal.closedAt,
      notes: investmentTradeJournal.notes,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId))
    .limit(limit);
  return buildResponse(
    "investment-trade-journal.csv",
    JOURNAL_HEADERS,
    rows.map((r) => ({
      instrumentId: r.instrumentId,
      activityType: r.activityType,
      status: r.status,
      activityDate: r.activityDate,
      quantity: r.quantity ?? "",
      openPrice: r.openPrice ?? "",
      closedAt:
        r.closedAt instanceof Date
          ? r.closedAt.toISOString()
          : (r.closedAt ?? ""),
      notes: r.notes ?? "",
    })),
  );
}

/** ZIP of instruments.csv + trade-journal.csv; fails whole if any kind over caps. */
export async function exportInvestmentAllZip(
  workspaceId: string,
): Promise<Response> {
  const limit = INVESTMENT_EXPORT_MAX_ROWS + 1;
  const encoder = new TextEncoder();

  const instrumentRows = await db
    .select({
      name: investmentInstrument.name,
      kind: investmentInstrument.kind,
      symbol: investmentInstrument.symbol,
      yahooSymbol: investmentInstrument.yahooSymbol,
      currency: investmentInstrument.currency,
      contractSize: investmentInstrument.contractSize,
      archived: investmentInstrument.archived,
    })
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId))
    .limit(limit);
  if (instrumentRows.length > INVESTMENT_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${INVESTMENT_EXPORT_MAX_ROWS}) for instruments.`,
    );
  }
  const instrumentsCsv = rowsToCsv([...INSTRUMENT_HEADERS], instrumentRows.map((r) => ({
    ...r,
    yahooSymbol: r.yahooSymbol ?? "",
    archived: Boolean(r.archived),
  })));
  if (encoder.encode(instrumentsCsv).byteLength > INVESTMENT_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${INVESTMENT_EXPORT_MAX_BYTES}) for instruments.`,
    );
  }

  const journalRows = await db
    .select({
      instrumentId: investmentTradeJournal.instrumentId,
      activityType: investmentTradeJournal.activityType,
      status: investmentTradeJournal.status,
      activityDate: investmentTradeJournal.activityDate,
      quantity: investmentTradeJournal.quantity,
      openPrice: investmentTradeJournal.openPrice,
      closedAt: investmentTradeJournal.closedAt,
      notes: investmentTradeJournal.notes,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId))
    .limit(limit);
  if (journalRows.length > INVESTMENT_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${INVESTMENT_EXPORT_MAX_ROWS}) for trade-journal.`,
    );
  }
  const journalCsv = rowsToCsv(
    [...JOURNAL_HEADERS],
    journalRows.map((r) => ({
      instrumentId: r.instrumentId,
      activityType: r.activityType,
      status: r.status,
      activityDate: r.activityDate,
      quantity: r.quantity ?? "",
      openPrice: r.openPrice ?? "",
      closedAt:
        r.closedAt instanceof Date
          ? r.closedAt.toISOString()
          : (r.closedAt ?? ""),
      notes: r.notes ?? "",
    })),
  );
  if (encoder.encode(journalCsv).byteLength > INVESTMENT_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${INVESTMENT_EXPORT_MAX_BYTES}) for trade-journal.`,
    );
  }

  return zipResponse(
    "investment-export-all.zip",
    buildZip([
      { name: "instruments.csv", data: encoder.encode(instrumentsCsv) },
      { name: "trade-journal.csv", data: encoder.encode(journalCsv) },
    ]),
  );
}

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import {
  isLoansImportKind,
  LOANS_IMPORT_ALL_ORDER,
  loansImportFieldDefs,
  type LoansImportKind,
} from "@/lib/loans-import-kinds";
import {
  csvResponse,
  exportMaxBytes,
  exportMaxRows,
  exportTooLargeResponse,
  rowsToCsv,
} from "@/lib/export-csv";
import { buildZip, zipResponse } from "@/lib/export-zip";

/** Never includes push subscriptions. */
export const LOANS_EXPORT_KINDS = [
  "loans",
  "installments",
] as const satisfies readonly LoansImportKind[];

export const LOANS_EXPORT_MAX_ROWS = exportMaxRows(
  "LOANS_EXPORT_MAX_ROWS",
  100_000,
);
export const LOANS_EXPORT_MAX_BYTES = exportMaxBytes(
  "LOANS_EXPORT_MAX_BYTES",
  5_242_880,
);

export function loansExportCsv(
  kind: LoansImportKind,
  rows: Record<string, unknown>[],
): string {
  const headers = loansImportFieldDefs(kind).map((d) => d.key);
  const normalized = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) out[h] = row[h] ?? "";
    return out;
  });
  return rowsToCsv(headers, normalized);
}

function buildResponse(kind: LoansImportKind, rows: Record<string, unknown>[]) {
  if (rows.length > LOANS_EXPORT_MAX_ROWS) {
    return exportTooLargeResponse(
      `Export exceeds max rows (${LOANS_EXPORT_MAX_ROWS}).`,
    );
  }
  const csv = loansExportCsv(kind, rows);
  const bytes = new TextEncoder().encode(csv).byteLength;
  if (bytes > LOANS_EXPORT_MAX_BYTES) {
    return exportTooLargeResponse(
      `Export exceeds max bytes (${LOANS_EXPORT_MAX_BYTES}).`,
    );
  }
  return csvResponse(`loans-${kind}.csv`, csv);
}

async function loadRows(
  workspaceId: string,
  kind: LoansImportKind,
): Promise<Record<string, unknown>[]> {
  const limit = LOANS_EXPORT_MAX_ROWS + 1;
  switch (kind) {
    case "loans": {
      const rows = await db
        .select({
          name: loan.name,
          currency: loan.currency,
          principalMinor: loan.principalMinor,
          annualRateBps: loan.annualRateBps,
          termMonths: loan.termMonths,
          startDate: loan.startDate,
          dueDayOfMonth: loan.dueDayOfMonth,
          paymentMinor: loan.paymentMinor,
          status: loan.status,
        })
        .from(loan)
        .where(eq(loan.workspaceId, workspaceId))
        .limit(limit);
      return rows;
    }
    case "installments": {
      const schedule = await db
        .select({
          id: loanScheduleInstallment.id,
          loanId: loanScheduleInstallment.loanId,
          installmentNumber: loanScheduleInstallment.installmentNumber,
          dueDate: loanScheduleInstallment.dueDate,
          paymentMinor: loanScheduleInstallment.paymentMinor,
          principalMinor: loanScheduleInstallment.principalMinor,
          interestMinor: loanScheduleInstallment.interestMinor,
          balanceAfterMinor: loanScheduleInstallment.balanceAfterMinor,
        })
        .from(loanScheduleInstallment)
        .innerJoin(loan, eq(loanScheduleInstallment.loanId, loan.id))
        .where(eq(loan.workspaceId, workspaceId))
        .limit(limit);
      if (schedule.length === 0) return [];
      const statusRows = await db
        .select({
          scheduleInstallmentId: loanInstallmentStatus.scheduleInstallmentId,
          status: loanInstallmentStatus.status,
        })
        .from(loanInstallmentStatus)
        .where(
          inArray(
            loanInstallmentStatus.scheduleInstallmentId,
            schedule.map((s) => s.id),
          ),
        );
      const statusById = new Map(
        statusRows.map((s) => [s.scheduleInstallmentId, s.status]),
      );
      return schedule.map((s) => ({
        loanId: s.loanId,
        installmentNumber: s.installmentNumber,
        dueDate: s.dueDate,
        paymentMinor: s.paymentMinor,
        principalMinor: s.principalMinor,
        interestMinor: s.interestMinor,
        balanceAfterMinor: s.balanceAfterMinor,
        payStatus: statusById.get(s.id) ?? "pending",
      }));
    }
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export async function exportLoansKindCsv(
  workspaceId: string,
  kindParam: string,
): Promise<Response> {
  if (!isLoansImportKind(kindParam)) {
    return Response.json(
      { error: "Unknown export kind", code: "bad_request" },
      { status: 400 },
    );
  }
  const rows = await loadRows(workspaceId, kindParam);
  return buildResponse(kindParam, rows);
}

export async function exportLoansAllZip(
  workspaceId: string,
): Promise<Response> {
  const encoder = new TextEncoder();
  const zipEntries: { name: string; data: Uint8Array }[] = [];
  for (const kind of LOANS_IMPORT_ALL_ORDER) {
    const rows = await loadRows(workspaceId, kind);
    if (rows.length > LOANS_EXPORT_MAX_ROWS) {
      return exportTooLargeResponse(
        `Export exceeds max rows (${LOANS_EXPORT_MAX_ROWS}) for ${kind}.`,
      );
    }
    const csv = loansExportCsv(kind, rows);
    const bytes = encoder.encode(csv).byteLength;
    if (bytes > LOANS_EXPORT_MAX_BYTES) {
      return exportTooLargeResponse(
        `Export exceeds max bytes (${LOANS_EXPORT_MAX_BYTES}) for ${kind}.`,
      );
    }
    zipEntries.push({ name: `${kind}.csv`, data: encoder.encode(csv) });
  }
  return zipResponse("loans-export-all.zip", buildZip(zipEntries));
}

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  loan,
  loanInstallmentStatus,
  loanScheduleInstallment,
} from "@/db/schema/loans";
import { ClientFacingError } from "@/lib/api-http";
import {
  isLoansImportKind,
  loansImportFieldDefs,
  type LoansImportKind,
} from "@/lib/loans-import-kinds";
import { assertImportRowCount } from "@/lib/feature-csv-rows";

export type LoansImportCommitBody = {
  type?: unknown;
  previewId?: unknown;
  rows?: unknown;
};

const LOAN_STATUSES = new Set(["active", "paid_off", "cancelled"]);
const PAY_STATUSES = new Set(["pending", "paid", "skipped"]);

export function validateLoansImportCommitBody(
  body: LoansImportCommitBody,
):
  | { ok: true; type: LoansImportKind; previewId: string }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid body" };
  }
  if (typeof body.type !== "string" || !isLoansImportKind(body.type)) {
    return { ok: false, message: "Unknown import type" };
  }
  if (typeof body.previewId !== "string" || !body.previewId.trim()) {
    return { ok: false, message: "previewId is required — run Preview first" };
  }
  return { ok: true, type: body.type, previewId: body.previewId.trim() };
}

export function validateLoansImportRows(
  kind: LoansImportKind,
  rows: unknown[],
): { ok: true; rows: Record<string, unknown>[] } | { ok: false; message: string } {
  const countErr = assertImportRowCount(rows);
  if (countErr) return { ok: false, message: countErr };

  const defs = loansImportFieldDefs(kind);
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, message: `Row ${i + 1}: expected an object` };
    }
    const row = raw as Record<string, unknown>;
    for (const def of defs) {
      if (!def.required) continue;
      const v = row[def.key];
      if (v === undefined || v === null || String(v).trim() === "") {
        return {
          ok: false,
          message: `Row ${i + 1}: ${def.key} is required`,
        };
      }
    }
    if (kind === "loans") {
      const status = String(row.status ?? "active").trim() || "active";
      if (!LOAN_STATUSES.has(status)) {
        return {
          ok: false,
          message: `Row ${i + 1}: status must be active, paid_off, or cancelled`,
        };
      }
      for (const numKey of [
        "principalMinor",
        "annualRateBps",
        "termMonths",
        "dueDayOfMonth",
        "paymentMinor",
      ] as const) {
        const n = Number(row[numKey]);
        if (!Number.isFinite(n)) {
          return {
            ok: false,
            message: `Row ${i + 1}: ${numKey} must be a number`,
          };
        }
      }
    } else {
      const installmentNumber = Number(row.installmentNumber);
      if (!Number.isFinite(installmentNumber) || installmentNumber < 1) {
        return {
          ok: false,
          message: `Row ${i + 1}: installmentNumber must be a positive number`,
        };
      }
      const payStatus = String(row.payStatus ?? "pending").trim() || "pending";
      if (!PAY_STATUSES.has(payStatus)) {
        return {
          ok: false,
          message: `Row ${i + 1}: payStatus must be pending, paid, or skipped`,
        };
      }
      for (const numKey of [
        "paymentMinor",
        "principalMinor",
        "interestMinor",
        "balanceAfterMinor",
      ] as const) {
        const n = Number(row[numKey]);
        if (!Number.isFinite(n)) {
          return {
            ok: false,
            message: `Row ${i + 1}: ${numKey} must be a number`,
          };
        }
      }
    }
    const projected: Record<string, unknown> = {};
    for (const def of defs) {
      projected[def.key] = row[def.key] ?? "";
    }
    out.push(projected);
  }
  return { ok: true, rows: out };
}

export type LoansImportAdapters = {
  appendLoan: (row: Record<string, unknown>) => Promise<"append">;
  upsertInstallment: (
    row: Record<string, unknown>,
  ) => Promise<"upsert" | "insert">;
};

export async function applyLoansImportRows(
  ctx: { workspaceId: string },
  kind: LoansImportKind,
  rows: Record<string, unknown>[],
  adapters: LoansImportAdapters,
): Promise<number> {
  void ctx;
  let count = 0;
  for (const row of rows) {
    if (kind === "loans") {
      await adapters.appendLoan(row);
      count += 1;
    } else {
      await adapters.upsertInstallment(row);
      count += 1;
    }
  }
  return count;
}

export async function commitLoansImport(
  ctx: { workspaceId: string; userSub: string },
  kind: LoansImportKind,
  rows: Record<string, unknown>[],
): Promise<number> {
  void ctx.userSub;
  const validated = validateLoansImportRows(kind, rows);
  if (!validated.ok) {
    throw new ClientFacingError(validated.message);
  }
  return applyLoansImportRows(ctx, kind, validated.rows, {
    appendLoan: async (row) => {
      await db.insert(loan).values({
        workspaceId: ctx.workspaceId,
        name: String(row.name ?? "Loan"),
        currency: String(row.currency ?? "USD"),
        principalMinor: Number(row.principalMinor ?? 0),
        annualRateBps: Number(row.annualRateBps ?? 0),
        termMonths: Number(row.termMonths ?? 1),
        startDate: String(row.startDate ?? "2026-01-01"),
        dueDayOfMonth: Math.min(
          28,
          Math.max(1, Number(row.dueDayOfMonth ?? 1)),
        ),
        paymentMinor: Number(row.paymentMinor ?? 0),
        status:
          String(row.status ?? "active") === "paid_off"
            ? "paid_off"
            : String(row.status ?? "active") === "cancelled"
              ? "cancelled"
              : "active",
      });
      return "append";
    },
    upsertInstallment: async (row) => {
      const loanId = String(row.loanId ?? "");
      const installmentNumber = Number(row.installmentNumber ?? 0);
      if (!loanId || !installmentNumber) {
        throw new Error("loanId and installmentNumber are required");
      }
      const parent = await db
        .select({ id: loan.id })
        .from(loan)
        .where(and(eq(loan.id, loanId), eq(loan.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!parent[0]) {
        throw new Error("Parent loan not found in workspace");
      }

      const existing = await db
        .select({ id: loanScheduleInstallment.id })
        .from(loanScheduleInstallment)
        .where(
          and(
            eq(loanScheduleInstallment.loanId, loanId),
            eq(loanScheduleInstallment.installmentNumber, installmentNumber),
          ),
        )
        .limit(1);

      const values = {
        dueDate: String(row.dueDate ?? "2026-01-01"),
        paymentMinor: Number(row.paymentMinor ?? 0),
        principalMinor: Number(row.principalMinor ?? 0),
        interestMinor: Number(row.interestMinor ?? 0),
        balanceAfterMinor: Number(row.balanceAfterMinor ?? 0),
      };

      let scheduleId: string;
      let result: "upsert" | "insert";
      if (existing[0]) {
        await db
          .update(loanScheduleInstallment)
          .set(values)
          .where(eq(loanScheduleInstallment.id, existing[0].id));
        scheduleId = existing[0].id;
        result = "upsert";
      } else {
        const inserted = await db
          .insert(loanScheduleInstallment)
          .values({
            loanId,
            installmentNumber,
            ...values,
          })
          .returning({ id: loanScheduleInstallment.id });
        scheduleId = inserted[0]!.id;
        result = "insert";
      }

      const payStatusRaw = String(row.payStatus ?? "pending");
      const payStatus =
        payStatusRaw === "paid" || payStatusRaw === "skipped"
          ? payStatusRaw
          : "pending";

      const statusExisting = await db
        .select({
          scheduleInstallmentId: loanInstallmentStatus.scheduleInstallmentId,
        })
        .from(loanInstallmentStatus)
        .where(eq(loanInstallmentStatus.scheduleInstallmentId, scheduleId))
        .limit(1);
      if (statusExisting[0]) {
        await db
          .update(loanInstallmentStatus)
          .set({ status: payStatus })
          .where(eq(loanInstallmentStatus.scheduleInstallmentId, scheduleId));
      } else {
        await db.insert(loanInstallmentStatus).values({
          scheduleInstallmentId: scheduleId,
          status: payStatus,
        });
      }
      return result;
    },
  });
}

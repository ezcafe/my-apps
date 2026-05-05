import { NextResponse } from "next/server";
import {
  forbidden,
  moneyDbUnavailable,
  requireMoneyContext,
} from "@/lib/api-money";
import { isDbUnreachable } from "@/lib/db-errors";
import { resetMoneyWorkspaceData } from "@/lib/money-reset-workspace";
import { assertWorkspaceOwner } from "@/lib/workspace-context";

export async function POST() {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const ownerOk = await assertWorkspaceOwner(ctx.userSub, ctx.workspaceId);
  if (!ownerOk) return forbidden();

  try {
    await resetMoneyWorkspaceData(ctx.workspaceId);
  } catch (e) {
    if (isDbUnreachable(e)) return moneyDbUnavailable();
    throw e;
  }

  return NextResponse.json({ data: { ok: true } });
}

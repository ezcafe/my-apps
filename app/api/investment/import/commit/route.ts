import { NextResponse } from "next/server";
import {
  badRequest,
  requireInvestmentContext,
  withInvestmentWorkspaceRls,
} from "@/lib/api-investment";
import {
  commitInvestmentStatement,
  type CommitInvestmentStatementInput,
} from "@/lib/investment-services/import-statement";
import { readJsonBounded, assertSameOriginStrict } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

async function requireSameOrigin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;
  if (!assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }
  return null;
}

export async function POST(req: Request) {
  const csrf = await requireSameOrigin(req);
  if (csrf) return csrf;

  const ctx = await requireInvestmentContext(req, { requireWrite: true });
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await readJsonBounded(req);
  } catch {
    return badRequest("Invalid JSON");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body");
  }

  const payload = body as CommitInvestmentStatementInput;

  try {
    const result = await withInvestmentWorkspaceRls(ctx, () =>
      commitInvestmentStatement(ctx.workspaceId, ctx.userSub, payload),
    );
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to import statement";
    return badRequest(msg);
  }
}

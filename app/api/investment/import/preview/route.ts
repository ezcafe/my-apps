import { NextResponse } from "next/server";
import {
  badRequest,
  requireInvestmentContext,
  withInvestmentWorkspaceRls,
} from "@/lib/api-investment";
import { previewInvestmentStatement } from "@/lib/investment-services/import-statement";
import { readJsonBounded, assertSameOriginStrict } from "@/lib/request-guards";
import type { StatementPlatform } from "@/lib/investment-statement-parsers";

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

  const { content, platform } = body as {
    content?: string;
    platform?: StatementPlatform;
  };

  if (!content || typeof content !== "string" || !content.trim()) {
    return badRequest("Statement content is required");
  }

  try {
    const preview = await withInvestmentWorkspaceRls(ctx, () =>
      previewInvestmentStatement(ctx.workspaceId, content, platform),
    );
    return NextResponse.json({ data: preview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse statement";
    return badRequest(msg);
  }
}

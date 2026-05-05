import { z } from "zod";
import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  requireMoneyContext,
} from "@/lib/api-money";
import { cloneMoneyWorkspaceStructure } from "@/lib/money-clone-workspace";
import { assertWorkspaceOwner } from "@/lib/workspace-context";

const cloneBodySchema = z.object({
  targetWorkspaceId: z.string().uuid(),
});

export async function POST(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = cloneBodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const { targetWorkspaceId } = parsed.data;
  if (targetWorkspaceId === ctx.workspaceId) {
    return badRequest("Source and target must differ");
  }

  const ownerOk = await assertWorkspaceOwner(ctx.userSub, targetWorkspaceId);
  if (!ownerOk) return forbidden();

  await cloneMoneyWorkspaceStructure(ctx.workspaceId, targetWorkspaceId);

  return NextResponse.json({ data: { ok: true } });
}

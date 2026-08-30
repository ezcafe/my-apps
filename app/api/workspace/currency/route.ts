import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema/workspace";
import { badRequest, forbidden, unauthorized } from "@/lib/api-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOriginStrict, readJsonBounded } from "@/lib/request-guards";
import { workspaceCurrencyPatchSchema } from "@/lib/validators/workspace";

export async function PATCH(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "workspace:currency",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_CURRENCY_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });
  if (!assertSameOriginStrict(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceCurrencyPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const member = await db
    .select({ workspaceId: workspaceMember.workspaceId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.userSub, userSub),
        eq(workspaceMember.workspaceId, parsed.data.workspaceId),
      ),
    )
    .limit(1);
  if (member.length === 0) return forbidden();

  const [updated] = await db
    .update(workspace)
    .set({ defaultCurrency: parsed.data.defaultCurrency.trim().toUpperCase() })
    .where(eq(workspace.id, parsed.data.workspaceId))
    .returning({
      workspaceId: workspace.id,
      defaultCurrency: workspace.defaultCurrency,
    });

  return NextResponse.json({ data: updated });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema/workspace";
import { badRequest, unauthorized } from "@/lib/api-money";
import { seedMoneyWorkspaceDefaults } from "@/lib/bootstrap";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, readJsonBounded } from "@/lib/request-guards";
import { workspaceCreateSchema } from "@/lib/validators/workspace";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();
  const allowed = await enforceRateLimit({
    name: "workspace:create",
    request: req,
    userKey: userSub,
    points: Number(process.env.WORKSPACE_CREATE_RPM ?? 10),
    durationSeconds: 60,
  });
  if (!allowed) return new Response("Too many requests", { status: 429 });
  if (!assertSameOrigin(req)) return badRequest("Cross-origin request blocked");

  let body: unknown;
  try {
    body = await readJsonBounded(req, Number(process.env.JSON_MAX_BYTES ?? 262144));
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = workspaceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const created = await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspace)
      .values({
        name: parsed.data.name.trim(),
        kind: "shared",
        ownedByUserSub: null,
        defaultCurrency: parsed.data.defaultCurrency?.trim().toUpperCase() ?? null,
      })
      .returning();

    await tx.insert(workspaceMember).values({
      workspaceId: ws.id,
      userSub,
      role: "owner",
    });

    if (parsed.data.seedApp === "money") {
      await seedMoneyWorkspaceDefaults(tx, ws.id);
    }

    return ws;
  });

  return NextResponse.json({
    data: {
      id: created.id,
      name: created.name,
      kind: created.kind,
      ownedByUserSub: created.ownedByUserSub,
      defaultCurrency: created.defaultCurrency,
      role: "owner" as const,
    },
  });
}

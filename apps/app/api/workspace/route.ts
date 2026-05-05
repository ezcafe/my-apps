import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema/workspace";
import { badRequest, unauthorized } from "@/lib/api-money";
import { seedMoneyWorkspaceDefaults } from "@/lib/bootstrap";
import { workspaceCreateSchema } from "@/lib/validators/workspace";

export async function POST(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
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
      role: "owner" as const,
    },
  });
}

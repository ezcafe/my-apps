import { NextResponse } from "next/server";
import {
  rateLimited,
  requireBabyContext,
  withBabyWorkspaceRls,
} from "@/lib/api-baby";
import { exportBabyAllZip } from "@/lib/baby-export";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireBabyContext(req);
  if ("error" in ctx) return ctx.error;

  const allowed = await enforceRateLimit({
    name: "baby:export:all",
    request: req,
    userKey: ctx.userSub,
    points: Number(process.env.BABY_EXPORT_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  try {
    return await withBabyWorkspaceRls(ctx, () =>
      exportBabyAllZip(ctx.workspaceId),
    );
  } catch (e: unknown) {
    console.error("[baby export all]", e);
    return NextResponse.json(
      { error: "Export failed", code: "bad_request" },
      { status: 400 },
    );
  }
}

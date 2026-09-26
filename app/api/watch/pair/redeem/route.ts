import { NextResponse } from "next/server";
import { badRequest, rateLimited } from "@/lib/api-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/request-guards";
import { watchPairRedeemSchema } from "@/lib/validators/watch-pair";
import { WatchPairError } from "@/lib/watch-pairing-codes";
import { redeemWatchPairingCodeLive } from "@/lib/watch-pairing-db";

export const dynamic = "force-dynamic";

function pairErrorResponse(e: WatchPairError) {
  const status = e.code === "RATE_LIMITED" ? 429 : 400;
  return NextResponse.json(
    { error: e.message, code: e.code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const allowed = await enforceRateLimit({
    name: "watch-pair:redeem",
    request: req,
    userKey: "anon",
    points: Number(process.env.WATCH_PAIR_REDEEM_RPM ?? 30),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let body: unknown;
  try {
    body = await readJsonBounded(
      req,
      Number(process.env.JSON_MAX_BYTES ?? 262144),
    );
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = watchPairRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") ||
        "Validation failed",
    );
  }

  try {
    const result = await redeemWatchPairingCodeLive(parsed.data.code);
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof WatchPairError) return pairErrorResponse(e);
    return badRequest("Redeem failed");
  }
}

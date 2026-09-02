import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unauthorized } from "@/lib/api-money";
import { enforceRateLimit } from "@/lib/rate-limit";
import { searchCities } from "@/lib/weather/open-meteo";

export async function GET(req: Request) {
  const session = await auth();
  const userSub = session?.user?.id;
  if (!userSub) return unauthorized();

  const allowed = await enforceRateLimit({
    name: "user:city-search",
    request: req,
    userKey: userSub,
    points: Number(process.env.USER_CITY_SEARCH_RPM ?? 60),
    durationSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const data = await searchCities(q);
  return NextResponse.json({ data });
}

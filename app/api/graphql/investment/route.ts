import { resolveRequestAuth } from "@/lib/api-auth";
import { handleMoneyGraphQL } from "@/lib/graphql/money-yoga";
import { enforceRateLimit } from "@/lib/rate-limit";

const graphqlRpm = Number(process.env.MONEY_GRAPHQL_RPM ?? 60);

function mergeResponseHeaders(response: Response, extra: Headers): Response {
  const out = new Headers(response.headers);
  extra.forEach((value, key) => {
    out.append(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}

async function handle(request: Request): Promise<Response> {
  const auth = await resolveRequestAuth(request);
  const allowed = await enforceRateLimit({
    name: "graphql-investment-legacy",
    request,
    userKey: auth.userSub,
    points: graphqlRpm,
    durationSeconds: 60,
  });
  if (!allowed) {
    return new Response("Too many requests", { status: 429 });
  }

  const responseHeaders = new Headers();
  const response = await handleMoneyGraphQL(request, responseHeaders);
  return mergeResponseHeaders(response, responseHeaders);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

import { resolveRequestAuth, type ResolvedRequestAuth } from "@/lib/api-auth";
import { handleMoneyGraphQL } from "@/lib/graphql/money-yoga";
import { assertSessionMutationCsrf } from "@/lib/request-guards";
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

/** Shared GraphQL entry: POST-only, CSRF for cookie sessions, single auth resolve. */
export async function handleMoneyGraphQLHttp(
  request: Request,
  rateLimitName: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const auth: ResolvedRequestAuth = await resolveRequestAuth(request);
  const hasCookie = Boolean(request.headers.get("cookie")?.trim());
  if (
    !assertSessionMutationCsrf(request, {
      authMethod: auth.method,
      hasCookie,
    })
  ) {
    return new Response("Cross-origin request blocked", { status: 403 });
  }

  const allowed = await enforceRateLimit({
    name: rateLimitName,
    request,
    userKey: auth.userSub,
    points: graphqlRpm,
    durationSeconds: 60,
  });
  if (!allowed) {
    return new Response("Too many requests", { status: 429 });
  }

  const responseHeaders = new Headers();
  const response = await handleMoneyGraphQL(request, responseHeaders, auth);
  return mergeResponseHeaders(response, responseHeaders);
}

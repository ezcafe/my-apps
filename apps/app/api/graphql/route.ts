import { handleMoneyGraphQL } from "@/lib/graphql/money-yoga";

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

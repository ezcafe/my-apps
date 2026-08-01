/**
 * Build request headers for GraphQL. In the browser, cookies go via
 * `credentials: "include"`. On the server, forward the incoming Cookie header
 * (dynamic import so client bundles never pull in `next/headers`).
 */
export async function graphqlRequestHeaders(): Promise<
  Record<string, string>
> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") return headers;

  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (cookieHeader) headers.Cookie = cookieHeader;
  } catch {
    // Outside a request scope (tests, build) — omit Cookie.
  }
  return headers;
}

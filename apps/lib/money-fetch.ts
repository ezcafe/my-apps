export async function moneyApiJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T }> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as { data: T };
}

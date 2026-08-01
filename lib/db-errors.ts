/** Walk error.cause / AggregateError.errors for errno codes (no secrets). */
export function collectErrnoCodes(err: unknown): string[] {
  const codes: string[] = [];
  const visit = (e: unknown) => {
    if (!e || typeof e !== "object") return;
    const o = e as NodeJS.ErrnoException & { cause?: unknown; errors?: unknown[] };
    if (o.code) codes.push(String(o.code));
    if (Array.isArray(o.errors)) for (const sub of o.errors) visit(sub);
    if (o.cause) visit(o.cause);
  };
  visit(err);
  return [...new Set(codes)];
}

export function isDbUnreachable(err: unknown): boolean {
  const codes = collectErrnoCodes(err);
  return (
    codes.includes("ECONNREFUSED") ||
    codes.includes("ENETUNREACH") ||
    codes.includes("ENOTFOUND") ||
    codes.includes("ETIMEDOUT")
  );
}

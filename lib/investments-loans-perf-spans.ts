/** Named spans for investments + loans list-read measure (Task 1). */

export const INVESTMENTS_PERF_SPAN_NAMES = [
  "investments.list",
  "investments.summary",
  "investments.overview",
  "investments.dehydrate",
] as const;

export const LOANS_PERF_SPAN_NAMES = [
  "loans.detail.serialize",
  "loans.list.page1",
  "loans.table.paint",
] as const;

export const INVESTMENTS_LOANS_PERF_SPAN_NAMES = [
  ...INVESTMENTS_PERF_SPAN_NAMES,
  ...LOANS_PERF_SPAN_NAMES,
] as const;

export type InvestmentsLoansPerfSpanName =
  (typeof INVESTMENTS_LOANS_PERF_SPAN_NAMES)[number];

export type InvestmentsLoansPerfSpan = {
  name: string;
  ms: number;
};

export type InvestmentsLoansPerfSpans = {
  time: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
  snapshot: () => InvestmentsLoansPerfSpan[];
};

export function isInvestmentsLoansPerfEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.INVESTMENTS_LOANS_PERF === "1";
}

export function createInvestmentsLoansPerfSpans(options?: {
  enabled?: boolean;
  now?: () => number;
}): InvestmentsLoansPerfSpans {
  const enabled = options?.enabled ?? true;
  const now = options?.now ?? (() => performance.now());
  const recorded: InvestmentsLoansPerfSpan[] = [];

  return {
    async time<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
      if (!enabled) return await fn();
      const start = now();
      try {
        return await fn();
      } finally {
        recorded.push({ name, ms: Math.max(0, now() - start) });
      }
    },
    snapshot() {
      return recorded.map((s) => ({ ...s }));
    },
  };
}

/** Rank spans by duration (slowest first); keep top N. */
export function rankInvestmentsLoansPerfSpans(
  spans: ReadonlyArray<InvestmentsLoansPerfSpan>,
  topN: number,
): InvestmentsLoansPerfSpan[] {
  return [...spans]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, Math.max(0, topN));
}

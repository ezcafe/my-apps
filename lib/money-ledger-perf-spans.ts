/** Named spans for money ledger first-load measure (Task 1). */

export const MONEY_LEDGER_PERF_SPAN_NAMES = [
  "bootstrap",
  "list.count",
  "list.rows",
  "list.tags",
  "summary",
  "dehydrate",
] as const;

export type MoneyLedgerPerfSpanName =
  (typeof MONEY_LEDGER_PERF_SPAN_NAMES)[number];

export type MoneyLedgerPerfSpan = {
  name: string;
  ms: number;
};

export type MoneyLedgerPerfSpans = {
  time: <T>(
    name: string,
    fn: () => Promise<T> | T,
  ) => Promise<T>;
  snapshot: () => MoneyLedgerPerfSpan[];
};

export function isMoneyLedgerPerfEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.MONEY_LEDGER_PERF === "1";
}

export function createMoneyLedgerPerfSpans(options?: {
  enabled?: boolean;
  now?: () => number;
}): MoneyLedgerPerfSpans {
  const enabled = options?.enabled ?? true;
  const now = options?.now ?? (() => performance.now());
  const recorded: MoneyLedgerPerfSpan[] = [];

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
export function rankMoneyLedgerPerfSpans(
  spans: ReadonlyArray<MoneyLedgerPerfSpan>,
  topN: number,
): MoneyLedgerPerfSpan[] {
  return [...spans]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, Math.max(0, topN));
}

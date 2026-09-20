/**
 * Pending Custom clock time for Nap / Diaper.
 * Maps to babyQuickCare / create fields per 03-design truth table.
 */

export type BabyHomeCustomClockTarget = "nap" | "diaper";

export type BabyHomeCustomClockPending = {
  iso: string;
  target: BabyHomeCustomClockTarget;
};

/** Which GraphQL time field the next save should send. */
export type BabyHomeCustomClockField = "occurredAt" | "endedAt";

/** Nap duration minutes — inclusive range for Custom modal. */
export const BABY_HOME_NAP_DURATION_MIN = 1;
export const BABY_HOME_NAP_DURATION_MAX = 480;

/**
 * Pending clock → wire field.
 * Nap idle → occurredAt; Nap running → endedAt; Diaper → occurredAt.
 */
export function babyHomeCustomClockField(input: {
  target: BabyHomeCustomClockTarget;
  /** True when ending an open nap (Nap chip running). */
  napRunning?: boolean;
}): BabyHomeCustomClockField {
  if (input.target === "diaper") return "occurredAt";
  return input.napRunning ? "endedAt" : "occurredAt";
}

/** Spread onto quick-care / create vars when pending ISO is set. */
export function babyHomeCustomClockMutationVars(input: {
  pendingIso: string | null | undefined;
  target: BabyHomeCustomClockTarget;
  napRunning?: boolean;
}): { occurredAt?: string; endedAt?: string } {
  const iso = input.pendingIso?.trim();
  if (!iso) return {};
  const field = babyHomeCustomClockField({
    target: input.target,
    napRunning: input.napRunning,
  });
  return field === "endedAt" ? { endedAt: iso } : { occurredAt: iso };
}

/** Log diaper create input — pending clock → `occurredAt` only. */
export function babyLogDiaperMutationInput(input: {
  kind: string;
  diaperColor?: string | null;
  diaperTexture?: string | null;
  diaperAmount?: string | null;
  pendingIso: string | null | undefined;
}): {
  kind: string;
  color?: string;
  texture?: string;
  amount?: string;
  occurredAt?: string;
  endedAt?: string;
} {
  const clockVars = babyHomeCustomClockMutationVars({
    pendingIso: input.pendingIso,
    target: "diaper",
  });
  return {
    kind: input.kind,
    ...(input.diaperColor ? { color: input.diaperColor } : {}),
    ...(input.diaperTexture ? { texture: input.diaperTexture } : {}),
    ...(input.diaperAmount ? { amount: input.diaperAmount } : {}),
    ...clockVars,
  };
}

/** Log sleep start input — pending clock → `occurredAt` only. */
export function babyLogSleepStartMutationInput(
  pendingIso: string | null | undefined,
): { occurredAt?: string; endedAt?: string } {
  return babyHomeCustomClockMutationVars({
    pendingIso,
    target: "nap",
    napRunning: false,
  });
}

/** Log sleep end input — pending clock → `endedAt` only. */
export function babyLogSleepEndMutationInput(
  pendingIso: string | null | undefined,
): { occurredAt?: string; endedAt?: string } {
  return babyHomeCustomClockMutationVars({
    pendingIso,
    target: "nap",
    napRunning: true,
  });
}

export function setBabyHomeCustomClockPending(
  _prev: string | null,
  iso: string,
): string {
  return iso;
}

export function clearBabyHomeCustomClockPending(): null {
  return null;
}

/** After a successful save for this target, drop pending clock. */
export function babyHomeClearCustomClockAfterSuccess(input: {
  pendingTarget: BabyHomeCustomClockTarget | null;
  savedTarget: BabyHomeCustomClockTarget;
}): boolean {
  return input.pendingTarget === input.savedTarget;
}

/** datetime-local value from ISO (Insights-style). */
export function babyHomeIsoToLocalInput(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO with offset for Zod. */
export function babyHomeLocalInputToIso(value: string): string {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Date(ms).toISOString();
}

/** endedAt = start + duration minutes (ISO). */
export function babyHomeNapEndedAtIso(input: {
  startIso: string;
  durationMinutes: number;
}): string {
  const startMs = Date.parse(input.startIso);
  return new Date(startMs + input.durationMinutes * 60_000).toISOString();
}

/** Parse nap duration minutes from modal input. */
export function parseBabyHomeNapDurationMinutes(
  raw: string,
):
  | { ok: true; minutes: number }
  | { ok: false; reasonKey: "home.customDurationInvalid" } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reasonKey: "home.customDurationInvalid" };
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, reasonKey: "home.customDurationInvalid" };
  }
  const minutes = Number(trimmed);
  if (
    !Number.isInteger(minutes) ||
    minutes < BABY_HOME_NAP_DURATION_MIN ||
    minutes > BABY_HOME_NAP_DURATION_MAX
  ) {
    return { ok: false, reasonKey: "home.customDurationInvalid" };
  }
  return { ok: true, minutes };
}

import { z } from "zod";

export const babyFeedMethodSchema = z.enum([
  "breast_l",
  "breast_r",
  "formula",
  "pump",
]);

export const babyDiaperKindSchema = z.enum(["wet", "dirty", "mixed"]);

export const babyGrowthKindSchema = z.enum([
  "weight",
  "height",
  "head",
  "temperature",
  "medication",
]);

export const babyCareSourceSchema = z.enum(["web", "telegram"]).optional().default("web");

export const babyDisplayNameSchema = z.string().trim().min(1).max(100);

const UPDATE_BABY_EVENT_PAYLOAD_MAX_CHARS = 4096;

export const createBabyFeedSchema = z.object({
  method: babyFeedMethodSchema,
  durationSec: z.number().int().positive().optional(),
  amountMl: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  source: babyCareSourceSchema,
});

export const createBabyDiaperSchema = z.object({
  kind: babyDiaperKindSchema,
  notes: z.string().max(2000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  source: babyCareSourceSchema,
});

export const startBabySleepSchema = z.object({
  notes: z.string().max(2000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  source: babyCareSourceSchema,
});

export const endBabySleepSchema = z.object({
  eventId: z.string().uuid().optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  source: babyCareSourceSchema,
});

export const createBabyGrowthSchema = z.object({
  kind: babyGrowthKindSchema,
  recordedAt: z.string().datetime({ offset: true }).optional(),
  valueNum: z.number().optional(),
  valueText: z.string().max(500).optional(),
  unit: z.string().max(32).optional(),
  notes: z.string().max(2000).optional(),
  source: babyCareSourceSchema,
});

export const updateBabyGrowthSchema = z.object({
  id: z.string().uuid(),
  kind: babyGrowthKindSchema.optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
  valueNum: z.number().nullable().optional(),
  valueText: z.string().max(500).nullable().optional(),
  unit: z.string().max(32).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Strict per-type payload patches for updateBabyEvent. */
export const updateBabyEventFeedPayloadSchema = z
  .object({
    method: babyFeedMethodSchema.optional(),
    durationSec: z.number().int().positive().optional(),
    amountMl: z.number().positive().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateBabyEventDiaperPayloadSchema = z
  .object({
    kind: babyDiaperKindSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateBabyEventSleepPayloadSchema = z
  .object({
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateBabyEventSchema = z
  .object({
    id: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).nullable().optional(),
    payload: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.payload === undefined) return;
    const size = JSON.stringify(val.payload).length;
    if (size > UPDATE_BABY_EVENT_PAYLOAD_MAX_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: `payload exceeds ${UPDATE_BABY_EVENT_PAYLOAD_MAX_CHARS} chars`,
        path: ["payload"],
      });
    }
  });

export function updateBabyEventPayloadSchemaForType(
  type: "feed" | "diaper" | "sleep",
) {
  if (type === "feed") return updateBabyEventFeedPayloadSchema;
  if (type === "diaper") return updateBabyEventDiaperPayloadSchema;
  return updateBabyEventSleepPayloadSchema;
}

export const babyTimelineInputSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

/** Growth list — same hard cap as timeline (1–100). Optional recordedAt window. */
export const babyGrowthListInputSchema = z
  .object({
    kind: babyGrowthKindSchema.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .superRefine((val, ctx) => {
    if (!val.from || !val.to) return;
    const fromMs = Date.parse(val.from);
    const toMs = Date.parse(val.to);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return;
    if (fromMs > toMs) {
      ctx.addIssue({
        code: "custom",
        message: "from must be before to",
        path: ["from"],
      });
    }
  });

/** Telegram chat ids are signed integers as strings (groups are negative). */
export const linkBabyTelegramSchema = z.object({
  chatId: z
    .string()
    .regex(/^-?\d{1,20}$/, "chatId must be a Telegram numeric id"),
});

export type CreateBabyFeedInput = z.input<typeof createBabyFeedSchema>;
export type CreateBabyDiaperInput = z.input<typeof createBabyDiaperSchema>;
export type StartBabySleepInput = z.input<typeof startBabySleepSchema>;
export type EndBabySleepInput = z.input<typeof endBabySleepSchema>;
export type CreateBabyGrowthInput = z.input<typeof createBabyGrowthSchema>;

export const babyVaccineDoseSchema = z.enum(["first", "second"]);

export const createBabyVaccineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: babyVaccineDoseSchema,
  administeredAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(2000).optional(),
  source: babyCareSourceSchema,
});

export const updateBabyVaccineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  dose: babyVaccineDoseSchema.optional(),
  administeredAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const babyVaccineListInputSchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    // GraphQL optional String arrives as null on the first infinite page.
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .superRefine((val, ctx) => {
    if (!val.from || !val.to) return;
    const fromMs = Date.parse(val.from);
    const toMs = Date.parse(val.to);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return;
    if (fromMs > toMs) {
      ctx.addIssue({
        code: "custom",
        message: "from must be before to",
        path: ["from"],
      });
    }
  });

export type CreateBabyVaccineInput = z.input<typeof createBabyVaccineSchema>;

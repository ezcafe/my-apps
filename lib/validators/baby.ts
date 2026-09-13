import { z } from "zod";
import {
  babyCalendarDayNumber,
  parseBabyCalendarDate,
} from "@/lib/baby-calendar-date";
import {
  BABY_DIAPER_AMOUNTS,
  BABY_DIAPER_COLORS,
  BABY_DIAPER_KINDS,
  BABY_DIAPER_TEXTURES,
  babyDiaperDetailAllowed,
} from "@/lib/baby-diaper-detail";

export const babyFeedMethodSchema = z.enum([
  "breast_l",
  "breast_r",
  "formula",
  "pump",
]);

export const babyDiaperKindSchema = z.enum(BABY_DIAPER_KINDS);
export const babyDiaperColorSchema = z.enum(BABY_DIAPER_COLORS);
export const babyDiaperTextureSchema = z.enum(BABY_DIAPER_TEXTURES);
export const babyDiaperAmountSchema = z.enum(BABY_DIAPER_AMOUNTS);

/** Reject color/texture/amount when kind is wet or dry. */
function refineDiaperDetailAllowed(
  val: {
    kind?: z.infer<typeof babyDiaperKindSchema>;
    color?: unknown;
    texture?: unknown;
    amount?: unknown;
  },
  ctx: z.RefinementCtx,
  paths: { color: string[]; texture: string[]; amount: string[] },
) {
  if (val.kind == null || babyDiaperDetailAllowed(val.kind)) return;
  if (val.color !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "diaper detail not allowed for this kind",
      path: paths.color,
    });
  }
  if (val.texture !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "diaper detail not allowed for this kind",
      path: paths.texture,
    });
  }
  if (val.amount !== undefined) {
    ctx.addIssue({
      code: "custom",
      message: "diaper detail not allowed for this kind",
      path: paths.amount,
    });
  }
}

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

export const babyFeedLegSchema = z.object({
  method: babyFeedMethodSchema,
  durationSec: z.number().int().positive().optional(),
  amountMl: z.number().positive().optional(),
});

/** Cap matches mergeFeedLegs after same-method collapse. */
export const BABY_FEED_LEGS_ZOD_MAX = 8;

export const createBabyFeedSchema = z.object({
  method: babyFeedMethodSchema,
  durationSec: z.number().int().positive().optional(),
  amountMl: z.number().positive().optional(),
  legs: z.array(babyFeedLegSchema).max(BABY_FEED_LEGS_ZOD_MAX).optional(),
  notes: z.string().max(2000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  source: babyCareSourceSchema,
});

export const createBabyDiaperSchema = z
  .object({
    kind: babyDiaperKindSchema,
    color: babyDiaperColorSchema.optional(),
    texture: babyDiaperTextureSchema.optional(),
    amount: babyDiaperAmountSchema.optional(),
    notes: z.string().max(2000).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    source: babyCareSourceSchema,
  })
  .superRefine((val, ctx) => {
    refineDiaperDetailAllowed(val, ctx, {
      color: ["color"],
      texture: ["texture"],
      amount: ["amount"],
    });
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
    legs: z.array(babyFeedLegSchema).max(BABY_FEED_LEGS_ZOD_MAX).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const updateBabyEventDiaperPayloadSchema = z
  .object({
    kind: babyDiaperKindSchema.optional(),
    color: babyDiaperColorSchema.optional(),
    texture: babyDiaperTextureSchema.optional(),
    amount: babyDiaperAmountSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    refineDiaperDetailAllowed(val, ctx, {
      color: ["color"],
      texture: ["texture"],
      amount: ["amount"],
    });
  });

export type UpdateBabyEventDiaperPayload = z.infer<
  typeof updateBabyEventDiaperPayloadSchema
>;

const DIAPER_DETAIL_KEYS = ["color", "texture", "amount"] as const;

/**
 * Merge diaper update patch onto existing payload.
 * - Omit-kind detail on wet/dry → Validation failed (same ban as create/quick-care).
 * - Kind flip to wet/dry → strip leftover color/texture/amount.
 */
export function mergeBabyEventDiaperPayload(
  existing: Record<string, unknown>,
  patch: UpdateBabyEventDiaperPayload,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing, ...patch };
  const kind = merged.kind;
  const kindOk =
    typeof kind === "string" &&
    (BABY_DIAPER_KINDS as readonly string[]).includes(kind);

  if (!kindOk || !babyDiaperDetailAllowed(kind as (typeof BABY_DIAPER_KINDS)[number])) {
    const patchSetsDetail = DIAPER_DETAIL_KEYS.some(
      (key) => patch[key] !== undefined,
    );
    if (patchSetsDetail) {
      throw new Error(
        "Validation failed: diaper detail not allowed for this kind",
      );
    }
    for (const key of DIAPER_DETAIL_KEYS) {
      delete merged[key];
    }
  }
  return merged;
}

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

export const babyBreastSideSchema = z.enum(["breast_l", "breast_r"]);

export const babyHomeQuickStatusInputSchema = z
  .object({
    dayFrom: z.string().datetime({ offset: true }),
    dayTo: z.string().datetime({ offset: true }),
  })
  .superRefine((val, ctx) => {
    const from = Date.parse(val.dayFrom);
    const to = Date.parse(val.dayTo);
    if (from >= to) {
      ctx.addIssue({
        code: "custom",
        message: "dayFrom must be before dayTo",
        path: ["dayFrom"],
      });
    }
    if (to - from > 26 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: "custom",
        message: "window must be one day",
        path: ["dayTo"],
      });
    }
  });

export const babyBirthDateSchema = z
  .string()
  .trim()
  .refine((v) => parseBabyCalendarDate(v) !== null, "BABY_BIRTH_DATE_INVALID");

export const updateBabyProfileSchema = z
  .object({
    birthDate: babyBirthDateSchema.nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.birthDate == null) return;
    const parsed = parseBabyCalendarDate(val.birthDate);
    if (!parsed) return; // babyBirthDateSchema already reported INVALID
    const day = babyCalendarDayNumber(parsed);
    const todayUtc = Math.floor(Date.now() / 86_400_000);
    if (day > todayUtc + 1) {
      ctx.addIssue({
        code: "custom",
        message: "BABY_BIRTH_DATE_FUTURE",
        path: ["birthDate"],
      });
    }
    if (day < todayUtc - 10 * 366) {
      ctx.addIssue({
        code: "custom",
        message: "BABY_BIRTH_DATE_TOO_OLD",
        path: ["birthDate"],
      });
    }
  });

export const babyQuickCareSchema = z
  .object({
    action: z.object({
      kind: z.enum(["BREAST", "FORMULA", "SLEEP", "DIAPER"]),
      side: babyBreastSideSchema.optional(),
      amountMl: z.number().positive().optional(),
      diaperKind: babyDiaperKindSchema.optional(),
      diaperColor: babyDiaperColorSchema.optional(),
      diaperTexture: babyDiaperTextureSchema.optional(),
      diaperAmount: babyDiaperAmountSchema.optional(),
    }),
    breastRunning: z
      .object({
        side: babyBreastSideSchema,
        durationSec: z.number().int().positive(),
      })
      .nullable()
      .optional(),
    /** Target feed row to merge when client still has an open/grace session. */
    feedSessionEventId: z.string().uuid().optional(),
    clientRequestId: z.string().trim().min(8).max(64),
  })
  .superRefine((v, ctx) => {
    const need = (ok: boolean, message: string, path: string) => {
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          message,
          path: ["action", path],
        });
      }
    };
    if (v.action.kind === "BREAST") {
      need(!!v.action.side, "BABY_QUICK_SIDE_REQUIRED", "side");
    }
    if (v.action.kind === "FORMULA") {
      need(
        v.action.amountMl != null,
        "BABY_QUICK_AMOUNT_REQUIRED",
        "amountMl",
      );
    }
    if (v.action.kind === "DIAPER") {
      need(!!v.action.diaperKind, "BABY_QUICK_DIAPER_REQUIRED", "diaperKind");
      refineDiaperDetailAllowed(
        {
          kind: v.action.diaperKind,
          color: v.action.diaperColor,
          texture: v.action.diaperTexture,
          amount: v.action.diaperAmount,
        },
        ctx,
        {
          color: ["action", "diaperColor"],
          texture: ["action", "diaperTexture"],
          amount: ["action", "diaperAmount"],
        },
      );
    }
  });

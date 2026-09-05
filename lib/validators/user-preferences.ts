import { z } from "zod";
import {
  KIOSK_WIDGET_IDS,
  kioskWidgetIdSchema,
} from "@/lib/kiosk/widget-registry";

export const userPreferencesPatchSchema = z.object({
  weatherCity: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),
  kioskWidgets: z
    .array(kioskWidgetIdSchema)
    .max(KIOSK_WIDGET_IDS.length)
    .optional(),
});

export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;

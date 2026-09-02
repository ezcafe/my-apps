import { z } from "zod";

export const userPreferencesPatchSchema = z.object({
  weatherCity: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional(),
});

export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;

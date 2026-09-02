import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema/user-preferences";
import { geocodeCity } from "@/lib/weather/open-meteo";
import {
  userPreferencesPatchSchema,
  type UserPreferencesPatch,
} from "@/lib/validators/user-preferences";

export type SerializedUserPreferences = {
  weatherCity: string | null;
  weatherLatitude: number | null;
  weatherLongitude: number | null;
  weatherGeocodedAt: string | null;
};

function parseCoord(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function serializeRow(
  row: typeof userPreferences.$inferSelect | undefined,
): SerializedUserPreferences {
  if (!row) {
    return {
      weatherCity: null,
      weatherLatitude: null,
      weatherLongitude: null,
      weatherGeocodedAt: null,
    };
  }
  return {
    weatherCity: row.weatherCity ?? null,
    weatherLatitude: parseCoord(row.weatherLatitude),
    weatherLongitude: parseCoord(row.weatherLongitude),
    weatherGeocodedAt: row.weatherGeocodedAt?.toISOString() ?? null,
  };
}

export async function getUserPreferences(
  userSub: string,
): Promise<SerializedUserPreferences> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userSub, userSub))
    .limit(1);
  return serializeRow(rows[0]);
}

export async function patchUserPreferences(
  userSub: string,
  body: unknown,
): Promise<SerializedUserPreferences> {
  const parsed = userPreferencesPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  return applyPreferencesPatch(userSub, parsed.data);
}

async function applyPreferencesPatch(
  userSub: string,
  patch: UserPreferencesPatch,
): Promise<SerializedUserPreferences> {
  if (!("weatherCity" in patch)) {
    return getUserPreferences(userSub);
  }

  const city = patch.weatherCity?.trim() ?? "";
  if (!city) {
    await db
      .insert(userPreferences)
      .values({
        userSub,
        weatherCity: null,
        weatherLatitude: null,
        weatherLongitude: null,
        weatherGeocodedAt: null,
      })
      .onConflictDoUpdate({
        target: userPreferences.userSub,
        set: {
          weatherCity: null,
          weatherLatitude: null,
          weatherLongitude: null,
          weatherGeocodedAt: null,
        },
      });
    return getUserPreferences(userSub);
  }

  const geocoded = await geocodeCity(city);
  if (!geocoded) {
    throw new Error("City not found");
  }

  const now = new Date();
  await db
    .insert(userPreferences)
    .values({
      userSub,
      weatherCity: city,
      weatherLatitude: String(geocoded.lat),
      weatherLongitude: String(geocoded.lon),
      weatherGeocodedAt: now,
    })
    .onConflictDoUpdate({
      target: userPreferences.userSub,
      set: {
        weatherCity: city,
        weatherLatitude: String(geocoded.lat),
        weatherLongitude: String(geocoded.lon),
        weatherGeocodedAt: now,
      },
    });

  return getUserPreferences(userSub);
}

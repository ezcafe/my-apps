import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  userSub: text("user_sub").primaryKey(),
  weatherCity: text("weather_city"),
  weatherLatitude: numeric("weather_latitude", { precision: 10, scale: 6 }),
  weatherLongitude: numeric("weather_longitude", { precision: 10, scale: 6 }),
  weatherGeocodedAt: timestamp("weather_geocoded_at", { withTimezone: true }),
});

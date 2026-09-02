import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema/user-preferences";
import {
  getUserPreferences,
  patchUserPreferences,
} from "@/lib/user-preferences-service";

const TEST_USER = "test-user-preferences-sub";

describe("user preferences service", () => {
  const hasDb = Boolean(process.env.DATABASE_URL);

  it("returns empty preferences when row is missing", { skip: !hasDb }, async () => {
    await db.delete(userPreferences).where(eq(userPreferences.userSub, TEST_USER));

    const prefs = await getUserPreferences(TEST_USER);
    assert.equal(prefs.weatherCity, null);
    assert.equal(prefs.weatherLatitude, null);
    assert.equal(prefs.weatherLongitude, null);
  });

  it("geocodes and stores weather city on patch", { skip: !hasDb }, async () => {
    await db.delete(userPreferences).where(eq(userPreferences.userSub, TEST_USER));

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("geocoding-api.open-meteo.com")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                latitude: 21.0285,
                longitude: 105.8542,
                name: "Hanoi",
                admin1: "Hanoi",
                country: "Vietnam",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return originalFetch(input);
    };

    try {
      const updated = await patchUserPreferences(TEST_USER, { weatherCity: "Hanoi" });
      assert.equal(updated.weatherCity, "Hanoi");
      assert.equal(updated.weatherLatitude, 21.0285);
      assert.equal(updated.weatherLongitude, 105.8542);
      assert.ok(updated.weatherGeocodedAt);
    } finally {
      globalThis.fetch = originalFetch;
      await db.delete(userPreferences).where(eq(userPreferences.userSub, TEST_USER));
    }
  });

  it("clears weather coordinates when city is cleared", { skip: !hasDb }, async () => {
    await db.insert(userPreferences).values({
      userSub: TEST_USER,
      weatherCity: "Hanoi",
      weatherLatitude: "21.0285",
      weatherLongitude: "105.8542",
      weatherGeocodedAt: new Date(),
    });

    const updated = await patchUserPreferences(TEST_USER, { weatherCity: null });
    assert.equal(updated.weatherCity, null);
    assert.equal(updated.weatherLatitude, null);
    assert.equal(updated.weatherLongitude, null);

    await db.delete(userPreferences).where(eq(userPreferences.userSub, TEST_USER));
  });
});

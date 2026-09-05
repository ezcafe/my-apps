import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KIOSK_WIDGET_IDS } from "@/lib/kiosk/widget-registry";
import { userPreferencesPatchSchema } from "@/lib/validators/user-preferences";

describe("userPreferencesPatchSchema", () => {
  it("accepts up to one of each kiosk widget id", () => {
    const parsed = userPreferencesPatchSchema.safeParse({
      kioskWidgets: [...KIOSK_WIDGET_IDS],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects kioskWidgets longer than the registry", () => {
    const parsed = userPreferencesPatchSchema.safeParse({
      kioskWidgets: [
        ...KIOSK_WIDGET_IDS,
        KIOSK_WIDGET_IDS[0],
      ],
    });
    assert.equal(parsed.success, false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_HOME_BREAST_PENDING_ORDER,
  BABY_HOME_PUMP_PENDING_ORDER,
  babyHomePickSectionPendingOwner,
} from "@/lib/baby-home-section-pending";

describe("babyHomePickSectionPendingOwner", () => {
  it("breast shared footer picks breast_l over breast_r when both pending", () => {
    assert.equal(
      babyHomePickSectionPendingOwner(
        ["breast_r", "breast_l"],
        BABY_HOME_BREAST_PENDING_ORDER,
      ),
      "breast_l",
    );
  });

  it("pump shared footer picks pump_l over pump_r over pump_amount", () => {
    assert.equal(
      babyHomePickSectionPendingOwner(
        ["pump_amount", "pump_r", "pump_l"],
        BABY_HOME_PUMP_PENDING_ORDER,
      ),
      "pump_l",
    );
    assert.equal(
      babyHomePickSectionPendingOwner(
        ["pump_amount", "pump_r"],
        BABY_HOME_PUMP_PENDING_ORDER,
      ),
      "pump_r",
    );
    assert.equal(
      babyHomePickSectionPendingOwner(
        ["pump_amount"],
        BABY_HOME_PUMP_PENDING_ORDER,
      ),
      "pump_amount",
    );
  });

  it("returns null when no section owner is pending", () => {
    assert.equal(
      babyHomePickSectionPendingOwner(["bottle"], BABY_HOME_BREAST_PENDING_ORDER),
      null,
    );
  });
});

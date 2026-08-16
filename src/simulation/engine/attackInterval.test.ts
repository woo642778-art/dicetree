import { describe, expect, it } from "vitest";
import { resolveAttackIntervalV3 } from "./attackInterval";

describe("Random Dice 2 attack interval evidence gate", () => {
  it("accepts the raw client interval when no unverified modifier is involved", () => {
    expect(resolveAttackIntervalV3({ baseInterval: 2.7 })).toEqual({
      interval: 2.7,
      attacksPerSecond: 1 / 2.7,
      confidence: "verified",
      unresolved: [],
    });
  });

  it("does not reuse the legacy interval-reduction assumption for attack-speed percent", () => {
    expect(resolveAttackIntervalV3({
      baseInterval: 2.7,
      attackSpeedPercent: 20,
      attackSpeedFormulaConfidence: "partial",
    })).toEqual({
      interval: null,
      attacksPerSecond: null,
      confidence: "partial",
      unresolved: ["attack-speed-ratio-formula"],
    });
  });

  it("does not apply AttackInterval_UpAdd until its runtime operation order is verified", () => {
    expect(resolveAttackIntervalV3({
      baseInterval: 2.7,
      directIntervalDelta: -0.32,
      directIntervalDeltaConfidence: "partial",
    })).toEqual({
      interval: null,
      attacksPerSecond: null,
      confidence: "partial",
      unresolved: ["direct-interval-delta-formula"],
    });
  });

  it("can apply a direct interval delta only when that exact operation is promoted to verified", () => {
    expect(resolveAttackIntervalV3({
      baseInterval: 1,
      directIntervalDelta: -0.1,
      directIntervalDeltaConfidence: "verified",
    })).toEqual({
      interval: 0.9,
      attacksPerSecond: 1 / 0.9,
      confidence: "verified",
      unresolved: [],
    });
  });
});

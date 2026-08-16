import { describe, expect, it } from "vitest";
import {
  buildDamageOutcomeV3,
  deterministicDpsRange,
  independentProcDpsRange,
} from "./outcomes";

describe("practical damage outcomes", () => {
  it("uses identical low average high values for deterministic damage", () => {
    expect(deterministicDpsRange(1000)).toEqual({ low: 1000, average: 1000, high: 1000 });
  });

  it("derives random outcome bands from exact proc-count percentiles", () => {
    const range = independentProcDpsRange({
      attacks: 10,
      durationSeconds: 10,
      baseDamagePerAttack: 100,
      procChance: 0.3,
      bonusDamagePerProc: 100,
    });
    expect(range).toEqual({
      low: 110,
      average: 130,
      high: 150,
    });
  });

  it("generates 5/10/30 second damage and kill-time ranges from the same DPS values", () => {
    const outcome = buildDamageOutcomeV3({ low: 100, average: 125, high: 150 }, 1500);
    expect(outcome.checkpoints).toEqual([
      { seconds: 5, low: 500, average: 625, high: 750 },
      { seconds: 10, low: 1000, average: 1250, high: 1500 },
      { seconds: 30, low: 3000, average: 3750, high: 4500 },
    ]);
    expect(outcome.killTimeSeconds).toEqual({
      low: 10,
      average: 12,
      high: 15,
    });
  });
});

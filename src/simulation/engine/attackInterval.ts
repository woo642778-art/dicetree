import type { CalculationConfidence } from "../../game-data/types";

export interface AttackIntervalResolutionInputV3 {
  baseInterval: number;
  attackSpeedPercent?: number;
  attackSpeedFormulaConfidence?: CalculationConfidence;
  directIntervalDelta?: number;
  directIntervalDeltaConfidence?: CalculationConfidence;
}

export interface AttackIntervalResolutionV3 {
  interval: number | null;
  attacksPerSecond: number | null;
  confidence: CalculationConfidence;
  unresolved: string[];
}

/**
 * Random Dice 2 exposes GetAttackIntervalByRatio / GetFinalAttackIntervalWithRuneEffect,
 * but the arithmetic and clamping path is not yet recovered well enough to promote a
 * percentage-based formula. This resolver therefore computes only cases that are proven
 * by their inputs and refuses to guess the ratio transformation.
 */
export function resolveAttackIntervalV3(
  input: AttackIntervalResolutionInputV3,
): AttackIntervalResolutionV3 {
  if (!Number.isFinite(input.baseInterval) || input.baseInterval <= 0) {
    return {
      interval: null,
      attacksPerSecond: null,
      confidence: "partial",
      unresolved: ["invalid-or-nonattacking-base-interval"],
    };
  }

  const unresolved: string[] = [];
  let interval = input.baseInterval;

  if (input.directIntervalDelta !== undefined && input.directIntervalDelta !== 0) {
    if (input.directIntervalDeltaConfidence !== "verified") {
      unresolved.push("direct-interval-delta-formula");
    } else {
      interval += input.directIntervalDelta;
    }
  }

  if (input.attackSpeedPercent !== undefined && input.attackSpeedPercent !== 0) {
    if (input.attackSpeedFormulaConfidence !== "verified") {
      unresolved.push("attack-speed-ratio-formula");
    } else {
      throw new Error(
        "A verified Random Dice 2 attack-speed ratio formula has not been registered yet; refusing implicit math",
      );
    }
  }

  if (unresolved.length) {
    return {
      interval: null,
      attacksPerSecond: null,
      confidence: "partial",
      unresolved,
    };
  }

  if (!Number.isFinite(interval) || interval <= 0) {
    return {
      interval: null,
      attacksPerSecond: null,
      confidence: "partial",
      unresolved: ["interval-clamp-or-minimum-not-verified"],
    };
  }

  return {
    interval,
    attacksPerSecond: 1 / interval,
    confidence: "verified",
    unresolved: [],
  };
}

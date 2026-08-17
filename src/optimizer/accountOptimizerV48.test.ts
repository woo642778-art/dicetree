import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import type { SimulationInputV3 } from "../simulation/engine/types";
import { compareCoreBudgetsV48, optimizeNextActionsV48, solveTargetPerformanceV48 } from "./accountOptimizerV48";

const input: SimulationInputV3 = {
  diceId: "wind", diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {},
  enemy: { id: "custom", kind: "custom", hp: 100_000 }, durationSeconds: 30,
};

describe("account optimizer V4.8", () => {
  it("separates Pareto actions and missing upgrade-cost data", () => {
    const actions = optimizeNextActionsV48(input, gameDataV3, ["wind", "ice", "adjust", "summon", "lock"], { lockedDiceIds: ["wind"] });
    expect(actions.some((action) => action.confidence === "partial")).toBe(true);
    expect(actions.some((action) => action.payload?.slot === 0)).toBe(false);
    expect(actions.at(-1)?.kind).toBe("data-required");
  });

  it("never exceeds reverse-plan budgets and preserves exact prerequisite ranks", () => {
    const plan = solveTargetPerformanceV48(input, gameDataV3, { targetGainPercent: 5, budget: { gold: 200_000, stone: 20 }, maxSteps: 4 });
    expect(plan.totalCost.gold).toBeLessThanOrEqual(200_000);
    expect(plan.totalCost.stone).toBeLessThanOrEqual(20);
    expect(plan.steps.every((step) => step.targetRanks[step.nodeId] !== undefined)).toBe(true);
  });

  it("compares fixed core scenarios in ascending order", () => {
    expect(compareCoreBudgetsV48(input, gameDataV3, 1_000_000).map((entry) => entry.core)).toEqual([100, 300, 500]);
  });
});

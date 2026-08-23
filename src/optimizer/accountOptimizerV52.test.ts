import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import type { SimulationInputV3 } from "../simulation/engine/types";
import { rankRunesForDiceV52, solveMultiStepBuildV52, solveWaveGoalV52 } from "./accountOptimizerV52";

const input: SimulationInputV3 = {
  diceId: "wind", diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {},
  enemy: { id: "custom", kind: "custom", hp: 100_000 }, durationSeconds: 30,
};

describe("account optimizer V5.2", () => {
  it("searches a legal multi-step beam without exceeding budget", () => {
    const plan = solveMultiStepBuildV52(input, gameDataV3, { targetDps: 1_000_000, budget: { gold: 300_000, stone: 60 }, maxSteps: 5, beamWidth: 4, candidateWidth: 4 });
    expect(plan.totalCost.gold).toBeLessThanOrEqual(300_000);
    expect(plan.totalCost.stone).toBeLessThanOrEqual(60);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps.every((step, index) => step.order === index + 1 && step.dpsAfter > step.dpsBefore)).toBe(true);
    expect(plan.checkpoints.every((checkpoint) => [1, 5].includes(checkpoint.step))).toBe(true);
  });

  it("filters Rune Lab to owned target-compatible runes", () => {
    const targetRune = gameDataV3.runes.find((rune) => rune.targetDiceId === "wind" || rune.targetDiceIds?.includes("wind"));
    expect(targetRune).toBeTruthy();
    const ranked = rankRunesForDiceV52(gameDataV3, "wind", new Set([targetRune!.id]));
    expect(ranked.map((entry) => entry.runeId)).toEqual([targetRune!.id]);
    expect(ranked[0].confidence).toBe("partial");
  });

  it("keeps wave inversion explicitly partial and monotonic", () => {
    const low = solveWaveGoalV52(input, gameDataV3, 10, 100_000);
    const high = solveWaveGoalV52(input, gameDataV3, 100, 100_000);
    expect(high.requiredDps).toBeGreaterThan(low.requiredDps);
    expect(high.confidence).not.toBe("verified");
  });
});

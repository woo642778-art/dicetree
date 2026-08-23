import { describe, expect, it } from "vitest";
import type { MultiStepBuildPlanV52 } from "../optimizer/accountOptimizerV52";
import type { PurchaseProduct } from "./products";
import { planPerformanceBudgetV52 } from "./planPerformanceBudgetV52";

const route: MultiStepBuildPlanV52 = {
  baselineDps: 100, targetDps: 200, achievedDps: 180, reached: false, confidence: "verified", totalCost: { gold: 200, stone: 10 }, evaluatedStates: 2, stopReason: "depth", checkpoints: [],
  steps: [
    { order: 1, nodeId: "a", fromRank: 0, toRank: 1, cost: { gold: 100, stone: 5 }, cumulativeCost: { gold: 100, stone: 5 }, dpsBefore: 100, dpsAfter: 140, gainPercent: 40, cumulativeGainPercent: 40, targetRanks: { a: 1 }, routeSteps: [{ nodeId: "a", fromRank: 0, toRank: 1, target: true }], reason: { ko: "", en: "" } },
    { order: 2, nodeId: "b", fromRank: 0, toRank: 1, cost: { gold: 100, stone: 5 }, cumulativeCost: { gold: 200, stone: 10 }, dpsBefore: 140, dpsAfter: 180, gainPercent: 28.5, cumulativeGainPercent: 80, targetRanks: { a: 1, b: 1 }, routeSteps: [{ nodeId: "b", fromRank: 0, toRank: 1, target: true }], reason: { ko: "", en: "" } },
  ],
};

function product(id: string, price: number, gold: number, core: number): PurchaseProduct {
  return { id, nameKo: id, priceUsd: price, officialKrw: price, rewards: { gold, core }, category: "special", rewardEvidence: "verified", sourceTables: [] };
}

describe("performance budget planner V5.2", () => {
  it("exhaustively chooses the package combination that reaches the deepest solved step", () => {
    const result = planPerformanceBudgetV52({ locale: "ko", cashBudget: 10, availableGold: 50, availableCore: 0, route }, [product("gold", 4, 150, 0), product("balanced", 6, 150, 10)]);
    expect(result.products.map((entry) => entry.id)).toEqual(["balanced"]);
    expect(result.reachedStep).toBe(2);
    expect(result.reachedDps).toBe(180);
    expect(result.evaluatedCombinations).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import {
  nextRankCost,
  projectResources,
  simulatedInvestmentCost,
  treeCostForRange,
} from "./costs";

describe("V3 Dice Tree cost calculations", () => {
  const amplification = gameDataV3.tree.find((node) => node.id === "5207")!;
  const chainPredation = gameDataV3.tree.find((node) => node.id === "5307")!;

  it("uses the exact client array entry for the next rank", () => {
    expect(nextRankCost(amplification, 0)).toEqual({ gold: 2000, stone: 0 });
    expect(nextRankCost(amplification, 5)).toEqual({ gold: 1600, stone: 1 });
    expect(nextRankCost(amplification, 50)).toBeNull();
  });

  it("sums only ranks between the current and target rank", () => {
    expect(treeCostForRange(amplification, 0, 6)).toEqual({ gold: 6800, stone: 1 });
    expect(treeCostForRange(amplification, 5, 6)).toEqual({ gold: 1600, stone: 1 });
    expect(treeCostForRange(amplification, 6, 6)).toEqual({ gold: 0, stone: 0 });
  });

  it("sums simulated investments above owned ranks across nodes", () => {
    const spent = simulatedInvestmentCost([amplification, chainPredation], {
      ownedRanks: { "5207": 5 },
      simulatedRanks: { "5207": 6, "5307": 1 },
    });
    expect(spent).toEqual({ gold: 51600, stone: 11 });
  });

  it("reports remaining resources and shortages independently", () => {
    expect(projectResources(
      { gold: 50000, stone: 10 },
      { gold: 51600, stone: 11 },
    )).toEqual({
      spent: { gold: 51600, stone: 11 },
      remaining: { gold: -1600, stone: -1 },
      shortage: { gold: 1600, stone: 1 },
      affordable: false,
    });
  });

  it("rejects out-of-range requests instead of extrapolating costs", () => {
    expect(() => treeCostForRange(amplification, 49, 51)).toThrow(RangeError);
  });
});

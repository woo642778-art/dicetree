import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../game-data/types";
import type { SimulationInputV3 } from "../engine/types";
import type { TreeAwareSimulationResultV3 } from "../engine/simulateTreeAware";
import { evaluateNodeV3, prerequisiteCostForNodeV3 } from "./evaluateNode";

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [{ id: "test-die", baseStats: { attack: 100, attackInterval: 1, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] }],
  tree: [
    { id: "p", family: "chaos", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 2, costsByRank: [{ gold: 100, stone: 0 }, { gold: 200, stone: 1 }], sourceRefs: [] },
    { id: "n", family: "chaos", kind: "passive", position: { x: 1, y: 0 }, prerequisites: [{ nodeId: "p", minRank: 2 }], maxRank: 2, costsByRank: [{ gold: 1000, stone: 1 }, { gold: 2000, stone: 2 }], sourceRefs: [] },
  ],
  passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
};

const input: SimulationInputV3 = {
  diceId: "test-die",
  diceProgressionLevel: 1,
  battleUpgradeLevel: 1,
  treeRanks: {},
  conditionValues: {},
  enemy: { id: "custom", kind: "custom", hp: 10000 },
  durationSeconds: 30,
};

function result(dps: number | null): TreeAwareSimulationResultV3 {
  return {
    diceId: "test-die",
    stats: {},
    basicAttackDps: dps,
    practicalDps: dps,
    confidence: dps === null ? "partial" : "verified",
    trace: [],
    unresolvedMechanics: dps === null ? ["formula"] : [],
    unresolvedStats: [],
    tree: { unresolvedNodeIds: [] },
  };
}

describe("V3 marginal node evaluation", () => {
  it("simulates the complete purchasable route instead of an unreachable target alone", () => {
    const seen: SimulationInputV3[] = [];
    const evaluated = evaluateNodeV3(input, data, "n", (next) => {
      seen.push(next);
      return result((next.treeRanks.n ?? 0) === 0 ? 100 : 125);
    });
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual(input);
    expect(seen[1]).toEqual({ ...input, treeRanks: { p: 2, n: 1 } });
    expect(evaluated.absoluteGain).toBe(25);
    expect(evaluated.percentGain).toBe(25);
    expect(evaluated.cost).toEqual({ gold: 1000, stone: 1 });
    expect(evaluated.confidence).toBe("verified");
  });

  it("sums exact missing prerequisite rank costs once", () => {
    expect(prerequisiteCostForNodeV3(data.tree[1], {}, data)).toEqual({ gold: 300, stone: 1 });
    expect(prerequisiteCostForNodeV3(data.tree[1], { p: 1 }, data)).toEqual({ gold: 200, stone: 1 });
  });

  it("does not fabricate gain when shared simulation is partial", () => {
    const evaluated = evaluateNodeV3(input, data, "n", () => result(null));
    expect(evaluated.confidence).toBe("partial");
    expect(evaluated.absoluteGain).toBeUndefined();
    expect(evaluated.percentGain).toBeUndefined();
    expect(evaluated.reasons).toContain("needs-mechanic-verification");
  });
});

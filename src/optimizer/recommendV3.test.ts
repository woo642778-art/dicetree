import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../game-data/types";
import type { SimulationInputV3 } from "../simulation/engine/types";
import type { MarginalNodeResultV3 } from "../simulation/marginal/evaluateNode";
import { recommendTreeInvestmentsV3 } from "./recommendV3";

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [], passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
  tree: [
    { id: "a", family: "chaos", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 1000, stone: 0 }], sourceRefs: [] },
    { id: "b", family: "chaos", kind: "passive", position: { x: 1, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 500, stone: 1 }], sourceRefs: [] },
    { id: "c", family: "chaos", kind: "passive", position: { x: 2, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 1, stone: 0 }], sourceRefs: [] },
    { id: "d", family: "chaos", kind: "dice", position: { x: 3, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 0, stone: 5 }], sourceRefs: [] },
  ],
};

const input: SimulationInputV3 = {
  diceId: "predator", diceProgressionLevel: 1, battleUpgradeLevel: 1,
  treeRanks: {}, conditionValues: {}, enemy: { id: "custom", kind: "custom" }, durationSeconds: 30,
};

function marginal(nodeId: string): MarginalNodeResultV3 {
  if (nodeId === "a") return { nodeId, beforeDps: 100, afterDps: 120, absoluteGain: 20, percentGain: 20, cost: { gold: 1000, stone: 0 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "verified", reasons: [] };
  if (nodeId === "b") return { nodeId, beforeDps: 100, afterDps: 130, absoluteGain: 30, percentGain: 30, cost: { gold: 500, stone: 1 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "verified", reasons: [] };
  if (nodeId === "d") return { nodeId, beforeDps: 100, afterDps: 100, absoluteGain: 0, percentGain: 0, cost: { gold: 0, stone: 5 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "verified", reasons: [] };
  return { nodeId, cost: { gold: 1, stone: 0 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "partial", reasons: ["needs-mechanic-verification"] };
}

describe("V3 recommendations", () => {
  it("ranks only positive verified simulated gains as exact recommendations", () => {
    const result = recommendTreeInvestmentsV3(input, data, { evaluate: (_input, _data, id) => marginal(id) });
    expect(result.verified.map((entry) => entry.nodeId)).toEqual(["b", "a"]);
    expect(result.verified.map((entry) => entry.nodeId)).not.toContain("d");
    expect(result.partial.map((entry) => entry.nodeId)).toEqual(["c"]);
  });

  it("uses only Gold and Dice Core route costs without fake resource weighting", () => {
    const result = recommendTreeInvestmentsV3(input, data, { evaluate: (_input, _data, id) => marginal(id) });
    expect(result.verified[0].totalRouteCost).toEqual({ gold: 500, stone: 1 });
    expect(Object.keys(result.verified[0].totalRouteCost).sort()).toEqual(["gold", "stone"]);
  });

  it("does not let a cheap partial candidate outrank verified candidates", () => {
    const result = recommendTreeInvestmentsV3(input, data, { evaluate: (_input, _data, id) => marginal(id), limit: 1 });
    expect(result.verified).toHaveLength(1);
    expect(result.verified[0].nodeId).toBe("b");
    expect(result.partial[0].nodeId).toBe("c");
  });
});

import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../game-data/types";
import { gameDataV3 } from "../game-data/load";
import { planGuidedRouteV3 } from "./planGuidedRouteV3";

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "now" },
  dice: [{ id: "atomic", family: "magic", baseStats: { extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] }],
  tree: [
    { id: "root", family: "core", kind: "milestone", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 10, stone: 0 }], sourceRefs: [] },
    { id: "attack", family: "magic", kind: "passive", position: { x: 1, y: 0 }, prerequisites: [{ nodeId: "root", minRank: 1 }], maxRank: 2, costsByRank: [{ gold: 20, stone: 0 }, { gold: 30, stone: 0 }], passiveOrRuneRef: "passive:MagicAttackUpPer", sourceRefs: [] },
    { id: "atomic-special", family: "magic", kind: "dice", position: { x: 2, y: 0 }, prerequisites: [{ nodeId: "attack", minRank: 1 }], targetId: "atomic", maxRank: 1, costsByRank: [{ gold: 40, stone: 1 }], passiveOrRuneRef: "rune:atomic", sourceRefs: [] },
  ],
  passives: [{ id: "MagicAttackUpPer", scope: "magic", maxRank: 2, baseValue: 10, valuePerRank: 5, confidence: "verified", sourceRefs: [] }],
  runes: [{ id: "atomic", targetDiceId: "atomic", values: {}, confidence: "verified", sourceRefs: [] }],
  enemies: [], localization: { ko: {}, en: {} },
};

function settings(overrides = {}) {
  return { diceId: "atomic", role: "dealer" as const, focus: "selected-dice" as const, style: "specialized" as const, length: "standard" as const, budget: { gold: 1_000, stone: 10 }, currentRanks: {}, ...overrides };
}

describe("planGuidedRouteV3", () => {
  it("returns a complete affordable route with prerequisites and exact costs", () => {
    const plan = planGuidedRouteV3(data, settings());
    expect(plan.steps.map((step) => step.nodeId)).toEqual(expect.arrayContaining(["root", "attack", "atomic-special"]));
    expect(plan.targetRanks["atomic-special"]).toBe(1);
    expect(plan.validity).toEqual({ prerequisitesSatisfied: true, exactCosts: true, withinBudget: true });
    expect(plan.totalCost).toEqual({ gold: 100, stone: 1 });
  });

  it("stops before exceeding the resource budget", () => {
    const plan = planGuidedRouteV3(data, settings({ budget: { gold: 25, stone: 0 } }));
    expect(plan.totalCost.gold).toBeLessThanOrEqual(25);
    expect(plan.validity.withinBudget).toBe(true);
  });

  it("keeps all canonical alternatives legal and within budget", () => {
    for (const variant of [0, 1, 2]) {
      const plan = planGuidedRouteV3(gameDataV3, {
        diceId: "element",
        role: "dealer",
        focus: "selected-dice",
        style: "specialized",
        length: "standard",
        budget: { gold: 9_999_999, stone: 999 },
        currentRanks: {},
        variant,
      });
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps.some((step) => gameDataV3.tree.find((node) => node.id === step.nodeId)?.targetId === "element")).toBe(true);
      expect(plan.validity).toEqual({ prerequisitesSatisfied: true, exactCosts: true, withinBudget: true });
    }
  });
});

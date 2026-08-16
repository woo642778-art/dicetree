import { describe, expect, it } from "vitest";
import type { DiceTreeNodeV3 } from "../game-data/types";
import { planNextRankRouteV3, planNodeRankRouteV3 } from "./routes";

const root: DiceTreeNodeV3 = {
  id: "root", family: "core", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 2,
  costsByRank: [{ gold: 100, stone: 0 }, { gold: 200, stone: 1 }], sourceRefs: [],
};
const child: DiceTreeNodeV3 = {
  id: "child", family: "chaos", kind: "perk", position: { x: 1, y: 0 }, prerequisites: [{ nodeId: "root", minRank: 2 }], maxRank: 1,
  costsByRank: [{ gold: 1000, stone: 2 }], sourceRefs: [],
};

describe("Dice Tree routes", () => {
  it("orders missing prerequisites before the target and totals exact client costs", () => {
    const route = planNextRankRouteV3([root, child], {}, "child");
    expect(route?.steps.map((step) => [step.nodeId, step.fromRank, step.toRank])).toEqual([
      ["root", 0, 2],
      ["child", 0, 1],
    ]);
    expect(route?.targetRanks).toEqual({ root: 2, child: 1 });
    expect(route?.prerequisiteCost).toEqual({ gold: 300, stone: 1 });
    expect(route?.totalCost).toEqual({ gold: 1300, stone: 3 });
  });

  it("charges only ranks that are still missing", () => {
    const route = planNodeRankRouteV3([root, child], { root: 1 }, "child", 1);
    expect(route.steps[0]).toMatchObject({ nodeId: "root", fromRank: 1, toRank: 2 });
    expect(route.totalCost).toEqual({ gold: 1200, stone: 3 });
  });

  it("rejects a prerequisite cycle instead of producing an invalid route", () => {
    expect(() => planNodeRankRouteV3([
      { ...root, prerequisites: [{ nodeId: "child", minRank: 1 }] },
      child,
    ], {}, "child", 1)).toThrow(/cycle/);
  });
});

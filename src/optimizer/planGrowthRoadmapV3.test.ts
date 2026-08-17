import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { buildGrowthRoadmapV3 } from "./planGrowthRoadmapV3";
import { planGuidedRouteV3 } from "./planGuidedRouteV3";

describe("growth roadmap", () => {
  it("partitions a valid route without changing exact cost or order", () => {
    const plan = planGuidedRouteV3(gameDataV3, {
      diceId: "predator", role: "dealer", focus: "selected-dice", style: "efficient", length: "long",
      budget: { gold: 5_000_000, stone: 1_000 }, currentRanks: {},
    });
    const roadmap = buildGrowthRoadmapV3(gameDataV3, plan);
    const steps = roadmap.stages.flatMap((stage) => stage.steps);
    expect(roadmap.stages).toHaveLength(3);
    expect(steps.map((step) => step.order)).toEqual(plan.steps.map((step) => step.order));
    expect(roadmap.stages.at(-1)?.remaining).toEqual(plan.remaining);
  });

  it("reports non-negative resource shortfalls", () => {
    const plan = planGuidedRouteV3(gameDataV3, {
      diceId: "predator", role: "dealer", focus: "selected-dice", style: "specialized", length: "short",
      budget: { gold: 2_000, stone: 1 }, currentRanks: {},
    });
    const roadmap = buildGrowthRoadmapV3(gameDataV3, plan);
    expect(roadmap.reserve.shortfall.gold).toBeGreaterThanOrEqual(0);
    expect(roadmap.reserve.shortfall.stone).toBeGreaterThanOrEqual(0);
  });
});

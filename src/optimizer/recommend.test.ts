import { expect, it } from "vitest";
import { recommendNextRoutes } from "./recommend";
import type { DiceDefinition, PlannerStateV1, TreeNodeDefinition } from "../domain/types";

const verification = { status: "verified" as const, checkedAt: "2026-08-15" };
const dice: DiceDefinition[] = [
  { id: "d", family: "chaos", localizationKey: "d", roles: ["dealer"], verification, tags: [] },
];
const make = (id: string, cost: number, amount: number): TreeNodeDefinition => ({
  id,
  family: "chaos",
  position: { x: 0, y: 0 },
  maxRank: 1,
  prerequisites: [],
  levels: [{
    rank: 1,
    costs: { gold: cost },
    costsKnown: true,
    effects: [{ kind: "bulletDamagePercent", amount, appliesTo: "all", verifiedFormula: false }],
    effectsKnown: true,
  }],
  localizationKey: id,
  verification,
  tags: [],
  investable: true,
  routeKnown: true,
});
const state: PlannerStateV1 = {
  schemaVersion: 1,
  dataVersion: "x",
  ranks: {},
  goals: { primaryDieId: "d", secondaryDieIds: [], role: "dealer", spendingProfile: "f2p" },
};

it("returns deterministic cost-aware recommendations", () => {
  const result = recommendNextRoutes(state, [make("cheap", 1000, 2), make("expensive", 10000, 3)], dice);
  expect(result[0].nodeId).toBe("cheap");
  expect(result[0].mode).toBe("heuristic");
});

it("does not recommend an upgrade that exceeds the configured total gold budget", () => {
  const budgeted: PlannerStateV1 = { ...state, goals: { ...state.goals, budget: { gold: 5000 } } };
  const result = recommendNextRoutes(budgeted, [make("fits", 4000, 1), make("too-expensive", 6000, 10)], dice);
  expect(result.map((item) => item.nodeId)).toEqual(["fits"]);
});

it("includes verified prerequisite investments in a destination route and cost", () => {
  const prerequisite = make("prerequisite", 1000, 0.2);
  const destination: TreeNodeDefinition = {
    ...make("destination", 2000, 8),
    prerequisites: [{ nodeId: "prerequisite", minRank: 1 }],
  };
  const result = recommendNextRoutes(state, [prerequisite, destination], dice);
  const recommendation = result.find((item) => item.nodeId === "destination");
  expect(recommendation?.route).toEqual([
    { nodeId: "prerequisite", targetRank: 1 },
    { nodeId: "destination", targetRank: 1 },
  ]);
  expect(recommendation?.incrementalCosts.gold).toBe(3000);
});

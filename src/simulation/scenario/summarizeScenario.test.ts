import { describe, expect, it } from "vitest";
import type { ScenarioResultV3 } from "./runScenario";
import { summarizeScenarioV3 } from "./summarizeScenario";

function result(overrides: Partial<ScenarioResultV3> = {}): ScenarioResultV3 {
  return {
    simulation: {
      diceId: "test",
      stats: {},
      basicAttackDps: 100,
      practicalDps: null,
      confidence: "partial",
      trace: [],
      unresolvedMechanics: [],
      unresolvedStats: [],
      tree: { unresolvedNodeIds: [] },
    },
    mechanic: { confidence: "partial", values: {}, unresolved: [], sourceRefs: [] },
    outcome: null,
    basicAttackOutcome: {
      dps: { low: 100, average: 100, high: 100 },
      checkpoints: [],
      killTimeSeconds: null,
    },
    basicAttackOutcomeKind: "verified",
    ...overrides,
  };
}

describe("summarizeScenarioV3", () => {
  it("keeps verified basic DPS usable when practical mechanics are unresolved", () => {
    expect(summarizeScenarioV3(result())).toMatchObject({
      dps: 100,
      metricKind: "verified-basic",
      confidence: "verified",
      includesSpecialMechanic: false,
      includesTree: true,
    });
  });

  it("marks tree-excluded projections as estimates", () => {
    expect(summarizeScenarioV3(result({ basicAttackOutcomeKind: "tree-excluded-projected" }))).toMatchObject({
      metricKind: "tree-excluded-projected",
      confidence: "estimated",
      includesTree: false,
    });
  });
});

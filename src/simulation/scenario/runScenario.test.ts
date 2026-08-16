import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../game-data/types";
import type { SimulationInputV3 } from "../engine/types";
import { runScenarioV3 } from "./runScenario";

const exactData: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [{ id: "plain", baseStats: { attack: 100, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] }],
  tree: [], passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
};

const input: SimulationInputV3 = {
  diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {},
  enemy: { id: "custom", kind: "custom", hp: 1000 }, durationSeconds: 30,
};

describe("runScenarioV3", () => {
  it("derives 5/10/30 second damage and kill time from the shared practical DPS", () => {
    const result = runScenarioV3(input, exactData);
    expect(result.simulation.practicalDps).toBe(50);
    expect(result.outcome?.checkpoints.map((point) => [point.seconds, point.average])).toEqual([
      [5, 250], [10, 500], [30, 1500],
    ]);
    expect(result.outcome?.killTimeSeconds?.average).toBe(20);
  });

  it("does not fabricate damage checkpoints when practical DPS is partial", () => {
    const data: CanonicalGameData = {
      ...exactData,
      dice: [{ ...exactData.dice[0], id: "special", mechanicRuleId: "UnknownSkill" }],
    };
    const result = runScenarioV3({ ...input, diceId: "special" }, data);
    expect(result.simulation.confidence).toBe("partial");
    expect(result.simulation.practicalDps).toBeNull();
    expect(result.outcome).toBeNull();
  });
});

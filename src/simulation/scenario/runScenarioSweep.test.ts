import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../game-data/types";
import { runScenarioSweepV3 } from "./runScenarioSweep";

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16" },
  dice: [{ id: "plain", family: "order", nameKey: "plain", baseStats: { attack: 100, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: ["test"] }],
  tree: [], passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
};

describe("runScenarioSweepV3", () => {
  it("runs every HP and duration combination and finds the first clearing duration", () => {
    const result = runScenarioSweepV3({
      diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1,
      treeRanks: {}, conditionValues: {}, enemy: { id: "custom", kind: "normal", values: {} }, durationSeconds: 30,
    }, data, [1_000, 100], [30, 5, 10]);
    expect(result.cells).toHaveLength(6);
    expect(result.firstClearDurationByHp[100]).toBe(5);
    expect(result.firstClearDurationByHp[1000]).toBe(30);
    expect(result.cells.find((cell) => cell.enemyHp === 1_000 && cell.durationSeconds === 10)?.totalDamage).toBe(500);
  });

  it("normalizes invalid and duplicate axes", () => {
    const result = runScenarioSweepV3({
      diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1,
      treeRanks: {}, conditionValues: {}, enemy: { id: "custom", kind: "normal", values: {} }, durationSeconds: 30,
    }, data, [100, 100, -1], [10, 10, 0]);
    expect(result.hpValues).toEqual([100]);
    expect(result.durationValues).toEqual([10]);
    expect(result.cells).toHaveLength(1);
  });
});

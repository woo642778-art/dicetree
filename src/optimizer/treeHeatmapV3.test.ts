import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../game-data/types";
import { buildTreeHeatmapV3 } from "./treeHeatmapV3";

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "x", extractedAt: "now" },
  dice: [{ id: "plain", family: "order", baseStats: { attack: 100, attackInterval: 1, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] }],
  tree: [], passives: [], runes: [], enemies: [], localization: { ko: {}, en: {} },
};

describe("tree ROI heatmap", () => {
  it("returns no entries when disabled", () => {
    expect(buildTreeHeatmapV3({ diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {}, enemy: { id: "x", kind: "custom" }, durationSeconds: 30 }, data, "none").size).toBe(0);
  });
});

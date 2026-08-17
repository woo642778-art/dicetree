import { describe, expect, it } from "vitest";
import { decodeSharedResultV47, encodeSharedResultV47 } from "./resultCodecV47";

const state = { schemaVersion: 3 as const, dataVersion: "test", ownedRanks: {}, simulatedRanks: {}, inventory: { gold: 1, stone: 2 }, scenario: { diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1, conditionValues: {}, enemyPresetId: "custom", durationSeconds: 30 } };
const options = { validNodeIds: new Set<string>(), maxRanks: new Map<string, number>(), validDiceIds: new Set(["plain", "ice"]) };

describe("resultCodecV47", () => {
  it("round trips planner, deck and author note", () => {
    const value = encodeSharedResultV47({ state, deckIds: ["plain", "ice"], title: "포식 덱", note: "초반은 안전하게", author: "모님" });
    const decoded = decodeSharedResultV47(value, options);
    expect(decoded.ok && decoded.result.title).toBe("포식 덱");
    expect(decoded.ok && decoded.result.deckIds).toEqual(["plain", "ice"]);
  });

  it("removes unknown and duplicate dice", () => {
    const value = encodeSharedResultV47({ state, deckIds: ["plain", "plain", "bad"], title: "x", note: "", author: "" });
    const decoded = decodeSharedResultV47(value, options);
    expect(decoded.ok && decoded.result.deckIds).toEqual(["plain"]);
    expect(decoded.ok && decoded.warnings).toContain("invalid-deck-entries-removed");
  });
});

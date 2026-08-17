import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { analyzeDeckCompositionV4, replacementCandidatesV4 } from "./analyzeDeck";

describe("deck composition analyzer", () => {
  const deck = ["predator", "light", "brokengrowth", "ice", "mine"];

  it("scores all seven requested dimensions and explains a known synergy", () => {
    const result = analyzeDeckCompositionV4(gameDataV3, deck);
    expect(Object.keys(result.scores).sort()).toEqual(["boss", "buff", "control", "damage", "economy", "growth", "overall", "stability"]);
    expect(Object.values(result.scores).every((value) => value >= 0 && value <= 100)).toBe(true);
    expect(result.insights.some((insight) => insight.kind === "synergy" && insight.ko.includes("포식"))).toBe(true);
  });

  it("returns three legal replacements with reproducible before and after scores", () => {
    const candidates = replacementCandidatesV4(gameDataV3, deck, 4);
    expect(candidates).toHaveLength(3);
    expect(candidates.every((entry) => !deck.includes(entry.toDiceId))).toBe(true);
    expect(candidates.every((entry) => entry.before === analyzeDeckCompositionV4(gameDataV3, deck).scores.overall)).toBe(true);
    expect(candidates[0].delta).toBeGreaterThanOrEqual(candidates[1].delta);
  });

  it("rejects client-only battlefield records as a valid five-dice deck", () => {
    const invalid = analyzeDeckCompositionV4(gameDataV3, ["predator", "light", "ice", "mine", "bomb"]);
    expect(invalid.insights[0].kind).toBe("warning");
  });
});

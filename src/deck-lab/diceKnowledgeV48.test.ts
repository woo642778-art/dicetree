import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { buildDiceKnowledgeV48, searchDiceKnowledgeV48 } from "./diceKnowledgeV48";

describe("dice knowledge V4.8", () => {
  it("explains known synergy partners and confidence", () => {
    const predator = buildDiceKnowledgeV48(gameDataV3, "predator");
    expect(predator?.partners.map((entry) => entry.diceId)).toContain("light");
    expect(predator?.summary.ko.length).toBeGreaterThan(0);
  });

  it("searches localized names, effects, and ids", () => {
    expect(searchDiceKnowledgeV48(gameDataV3, "predator").some((entry) => entry.diceId === "predator")).toBe(true);
    expect(searchDiceKnowledgeV48(gameDataV3, "원자").some((entry) => entry.diceId === "element")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { analyzeDeckDiceV4, recommendDeckV4 } from "./recommendDeck";

describe("recommendDeckV4", () => {
  it("builds a five-dice game-data synergy deck", () => {
    const result = recommendDeckV4(gameDataV3, "balanced", "free");
    expect(result.dice).toHaveLength(5);
    expect(new Set(result.dice.map((entry) => entry.diceId)).size).toBe(5);
    expect(result.dice.some((entry) => entry.roles.includes("dealer"))).toBe(true);
    expect(result.dice.some((entry) => entry.roles.includes("economy"))).toBe(true);
    expect(result.source).toBe("game-data-synergy");
  });

  it("classifies client-described control and economy functions", () => {
    const ice = gameDataV3.dice.find((dice) => dice.id === "ice")!;
    const mine = gameDataV3.dice.find((dice) => dice.id === "mine")!;
    expect(analyzeDeckDiceV4(ice, gameDataV3).roles).toContain("control");
    expect(analyzeDeckDiceV4(mine, gameDataV3).roles).toContain("economy");
  });

  it("keeps zero-interval special attacks out of invented basic DPS", () => {
    const sniper = gameDataV3.dice.find((dice) => dice.id === "sniper")!;
    expect(analyzeDeckDiceV4(sniper, gameDataV3).basicDps).toBeNull();
    expect(analyzeDeckDiceV4(sniper, gameDataV3).calculation).toBe("unavailable");
  });
});

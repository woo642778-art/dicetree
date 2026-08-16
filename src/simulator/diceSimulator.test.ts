import { describe, expect, it } from "vitest";
import { getDiceDefinition, getRuneDefinitionsForDice } from "../game-data/rd2Extracted";
import { simulateDiceStats } from "./diceSimulator";

describe("Random Dice 2 dice simulator", () => {
  it("loads Predator's actual base combat table values", () => {
    const predator = getDiceDefinition("Predator");
    expect(predator.name.ko).toBe("포식 주사위");
    expect(predator.family).toBe("chaos");
    expect(predator.attack).toBe(1000);
    expect(predator.attackLevelAdd).toBe(0);
    expect(predator.attackUpgradeAdd).toBe(0);
    expect(predator.attackInterval).toBeCloseTo(2.7);
    expect(predator.attackIntervalUpgradeAdd).toBeCloseTo(-0.08);
    expect(predator.range).toBeCloseTo(1.2);
    expect(predator.rangeLevelAdd).toBeCloseTo(0.05);
  });

  it("simulates the table-defined level and power-up deltas without inventing a hidden formula", () => {
    const result = simulateDiceStats("Predator", { level: 4, powerUp: 3 });
    expect(result.attack).toBe(1000);
    expect(result.attackInterval).toBeCloseTo(2.54);
    expect(result.attacksPerSecond).toBeCloseTo(1 / 2.54);
    expect(result.range).toBeCloseTo(1.35);
  });

  it("exposes Predator's three actual exclusive tree runes", () => {
    const runes = getRuneDefinitionsForDice("Predator");
    expect(runes.map((rune) => rune.name.ko)).toEqual(["포식 증폭", "연쇄 포식", "약자 포식"]);
    expect(runes[0].maxRank).toBe(50);
    expect(runes[0].value1).toBe(5);
    expect(runes[0].value1RankAdd).toBe(5);
    expect(runes[1].value1).toBe(30);
    expect(runes[1].value2).toBe(2);
  });
});

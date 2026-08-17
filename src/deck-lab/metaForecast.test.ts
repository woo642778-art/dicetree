import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { analyzeRosterMeta, NEXT_META_FORECASTS, observedRanksForComposition } from "./metaForecast";
import { playableDiceV3 } from "../game-data/playableDice";

describe("next-meta forecast", () => {
  it("analyzes the full roster before presenting forecasts", () => {
    const analysis = analyzeRosterMeta(gameDataV3);
    expect(analysis.analyzedDice).toBe(playableDiceV3(gameDataV3).length);
    expect(analysis.rankedDice + analysis.unrankedDice).toBe(playableDiceV3(gameDataV3).length);
    expect(analysis.mechanicDice).toBeGreaterThan(0);
  });

  it("keeps every forecast tied to observed low-frequency compositions", () => {
    const diceIds = new Set(gameDataV3.dice.map((dice) => dice.id));
    for (const forecast of NEXT_META_FORECASTS) {
      expect(forecast.diceIds).toHaveLength(5);
      expect(forecast.diceIds.every((diceId) => diceIds.has(diceId))).toBe(true);
      expect(observedRanksForComposition(forecast.diceIds)).toEqual(forecast.observedRanks);
      expect(forecast.confidence).toBeLessThan(70);
    }
  });
});

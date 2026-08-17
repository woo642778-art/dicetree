import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { buildRivalSequenceV49, optimizeDeckAgainstV49 } from "./rivalBuilderV49";

const USER_DECK = ["predator", "brokengrowth", "decay", "switch", "adjust"];

describe("rival builder V4.9", () => {
  it("builds a deterministic four-step counter and revision sequence", () => {
    const first = buildRivalSequenceV49(gameDataV3, USER_DECK);
    const second = buildRivalSequenceV49(gameDataV3, USER_DECK);

    expect(first).toEqual(second);
    expect(first.turns.map((turn) => turn.actor)).toEqual(["user", "rival", "user", "rival"]);
    expect(first.turns.every((turn) => turn.diceIds.length === 5 && new Set(turn.diceIds).size === 5)).toBe(true);
    expect(first.turns[1].reasons.length).toBeGreaterThan(0);
    expect(first.turns[2].changes.length).toBeGreaterThan(0);
    expect(first.disclosure.ko).toContain("승률");
  });

  it("improves or preserves matchup score from a supplied seed", () => {
    const optimized = optimizeDeckAgainstV49(gameDataV3, USER_DECK, USER_DECK);
    expect(optimized.score).toBeGreaterThanOrEqual(optimized.seedScore);
    expect(optimized.diceIds).toHaveLength(5);
  });
});

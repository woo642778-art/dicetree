import { describe, expect, it } from "vitest";
import { classifyCoOpDeck, CO_OP_RANKING_SNAPSHOT, summarizeDiceUsage } from "./coOpRankingSnapshot";

describe("co-op ranking snapshot", () => {
  it("covers each supplied rank exactly once and keeps five dice per deck", () => {
    expect(CO_OP_RANKING_SNAPSHOT).toHaveLength(105);
    expect(CO_OP_RANKING_SNAPSHOT.map((deck) => deck.rank)).toEqual(Array.from({ length: 105 }, (_, index) => index + 1));
    for (const deck of CO_OP_RANKING_SNAPSHOT) {
      expect(deck.diceIds).toHaveLength(5);
      expect(new Set(deck.diceIds).size).toBe(5);
    }
  });

  it("separates direct damage cores from support compositions", () => {
    expect(CO_OP_RANKING_SNAPSHOT[0]?.role).toBe("dealer");
    expect(CO_OP_RANKING_SNAPSHOT[1]?.role).toBe("support");
    expect(classifyCoOpDeck(["electric", "decay", "light", "adjust", "brokengrowth"])).toBe("dealer");
    expect(classifyCoOpDeck(["ice", "lock", "resonance", "summon", "adjust"])).toBe("support");
  });

  it("summarizes usage across all 105 decks", () => {
    const usage = summarizeDiceUsage();
    expect(usage[0]?.diceId).toBe("adjust");
    expect(usage[0]?.decks).toBe(105);
    expect(usage.every((entry) => entry.decks > 0 && entry.share > 0 && entry.share <= 1)).toBe(true);
  });
});

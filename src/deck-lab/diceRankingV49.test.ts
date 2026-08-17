import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../game-data/load";
import { playableDiceV3 } from "../game-data/playableDice";
import { rankDiceV49 } from "./diceRankingV49";

describe("dice ranking V4.9", () => {
  it("ranks the complete playable roster and exposes evidence", () => {
    const ranked = rankDiceV49(gameDataV3, { role: "all" });
    expect(ranked).toHaveLength(playableDiceV3(gameDataV3).length);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked.at(-1)!.score);
    expect(ranked[0].reason.ko.length).toBeGreaterThan(10);
    expect(ranked.every((entry) => entry.source === "observed-meta-and-client-stats")).toBe(true);
  });

  it("filters by role and localized search without inventing characters", () => {
    const dealers = rankDiceV49(gameDataV3, { role: "dealer" });
    expect(dealers.length).toBeGreaterThan(0);
    expect(dealers.every((entry) => entry.roles.includes("dealer"))).toBe(true);

    const predator = rankDiceV49(gameDataV3, { role: "all", query: "포식", locale: "ko" });
    expect(predator.map((entry) => entry.diceId)).toContain("predator");
  });
});

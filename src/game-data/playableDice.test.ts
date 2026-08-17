import { describe, expect, it } from "vitest";
import { gameDataV3 } from "./load";
import { isPlayableDiceV3, NON_PLAYABLE_DICE_IDS, playableDiceV3 } from "./playableDice";

describe("playableDiceV3", () => {
  it("excludes client-only battlefield objects while retaining utility dice", () => {
    const ids = playableDiceV3(gameDataV3).map((dice) => dice.id);
    expect([...NON_PLAYABLE_DICE_IDS].sort()).toEqual(["altar", "bomb", "spgemstone"]);
    expect(ids).not.toContain("spgemstone");
    expect(ids).not.toContain("altar");
    expect(ids).not.toContain("bomb");
    expect(ids).toContain("joker");
  });

  it("only rejects explicitly verified non-deck records", () => {
    expect(isPlayableDiceV3("predator")).toBe(true);
    expect(isPlayableDiceV3("joker")).toBe(true);
    expect(isPlayableDiceV3("bomb")).toBe(false);
  });
});

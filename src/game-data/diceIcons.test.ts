import manifest from "../../public/dice-icons/manifest.json";
import { describe, expect, it } from "vitest";
import { gameDataV3 } from "./load";

describe("dice icon assets", () => {
  it("provides one non-empty image for every canonical dice", () => {
    expect(Object.keys(manifest)).toHaveLength(gameDataV3.dice.length);
    for (const dice of gameDataV3.dice) {
      const entry = manifest[dice.id as keyof typeof manifest];
      expect(entry, dice.id).toBeDefined();
      expect(entry.width).toBe(256);
      expect(entry.height).toBe(256);
      expect(entry.file).toBe(`${dice.id}.webp`);
      expect(entry.sourceSprite.length).toBeGreaterThan(2);
    }
  });
});

import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../../game-data/load";
import { collectTreeModifiersV3 } from "./modifiers";

describe("V3 tree stat modifier collection", () => {
  it("extracts the real global bullet damage percentage at its simulated rank", () => {
    const result = collectTreeModifiersV3(gameDataV3, "predator", { "5109": 3 });
    const raw = result.modifiers.find((modifier) => modifier.id === "tree:5109:bulletDamagePercent");
    expect(raw).toMatchObject({
      stat: "bulletDamagePercent",
      value: 6.2,
      confidence: "verified",
    });
    expect(result.modifiers).toContainEqual(expect.objectContaining({
      id: "tree:5109:attack-formula-guard",
      stat: "attack",
      confidence: "partial",
    }));
  });

  it("applies a Chaos family attack-speed passive to Predator but not Order dice", () => {
    const predator = collectTreeModifiersV3(gameDataV3, "predator", { "5103": 1 });
    expect(predator.modifiers).toContainEqual(expect.objectContaining({
      stat: "attackSpeedPercent",
      value: 5,
      confidence: "verified",
    }));
    expect(predator.modifiers).toContainEqual(expect.objectContaining({
      stat: "attackInterval",
      confidence: "partial",
    }));

    const bingo = collectTreeModifiersV3(gameDataV3, "bingo", { "5103": 1 });
    expect(bingo.modifiers).toEqual([]);
  });

  it("extracts simple dice-specific bullet damage runes", () => {
    const fire = collectTreeModifiersV3(gameDataV3, "fire", { "1201": 2 });
    expect(fire.modifiers).toContainEqual(expect.objectContaining({
      stat: "bulletDamagePercent",
      value: 24,
      confidence: "verified",
    }));
  });

  it("leaves complex Predator runes to the dedicated mechanic rule", () => {
    const result = collectTreeModifiersV3(gameDataV3, "predator", { "5207": 10 });
    expect(result.modifiers).toEqual([]);
    expect(result.unresolvedNodeIds).toEqual(["5207"]);
  });
});

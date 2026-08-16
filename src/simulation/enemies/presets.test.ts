import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../../game-data/load";
import { buildEnemyPresetsV3, resolveEnemyPresetV3 } from "./presets";

describe("IPA-backed enemy presets", () => {
  it("exposes the extracted enemies plus a custom preset", () => {
    const presets = buildEnemyPresetsV3(gameDataV3);
    expect(presets).toHaveLength(gameDataV3.enemies.length + 1);
    expect(presets[0]).toMatchObject({ id: "custom", kind: "custom", requiresHpInput: true });
    expect(presets.some((preset) => preset.kind === "boss")).toBe(true);
  });

  it("does not turn a client HP multiplier into an invented absolute HP", () => {
    const preset = buildEnemyPresetsV3(gameDataV3).find((candidate) => candidate.id !== "custom")!;
    const scenario = resolveEnemyPresetV3(preset.id, undefined, gameDataV3);
    expect(scenario.hp).toBeUndefined();
    expect(scenario.values?.hpSource).toBe("required-user-input");
  });

  it("accepts an explicit user HP while preserving the client category values", () => {
    const boss = buildEnemyPresetsV3(gameDataV3).find((candidate) => candidate.kind === "boss")!;
    const scenario = resolveEnemyPresetV3(boss.id, 5000000, gameDataV3);
    expect(scenario.kind).toBe("boss");
    expect(scenario.hp).toBe(5000000);
    expect(scenario.values?.hpSource).toBe("user-override");
  });
});

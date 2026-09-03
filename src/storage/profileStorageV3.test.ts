import { beforeEach, describe, expect, it } from "vitest";
import { createProfileBackupV55, deleteProfileV3, findProfileByNameV3, importProfileBackupV55, listProfilesV3, saveProfileV3 } from "./profileStorageV3";

const state = {
  schemaVersion: 3 as const, dataVersion: "test", ownedRanks: {}, simulatedRanks: {}, inventory: { gold: 1, stone: 2 },
  scenario: { diceId: "plain", diceProgressionLevel: 1, battleUpgradeLevel: 1, conditionValues: {}, enemyPresetId: "custom", durationSeconds: 30 },
};

describe("profileStorageV3", () => {
  beforeEach(() => localStorage.clear());
  it("saves, updates and deletes isolated profiles", () => {
    const saved = saveProfileV3({ name: "본계정", state, activeDeckIds: ["plain"], deckGoal: "dealer", spendProfile: "light" }, "main");
    expect(listProfilesV3()).toHaveLength(1);
    saveProfileV3({ ...saved, name: "본계정 2", state }, "main");
    expect(listProfilesV3()[0].name).toBe("본계정 2");
    deleteProfileV3("main");
    expect(listProfilesV3()).toEqual([]);
  });

  it("isolates corrupt entries", () => {
    localStorage.setItem("dicetree.profiles.v3", JSON.stringify([{ id: "bad" }]));
    expect(listProfilesV3()).toEqual([]);
  });

  it("finds a saved account nickname with normalized text", () => {
    saveProfileV3({ name: "  Ａsmo  ", state, activeDeckIds: ["plain"], deckGoal: "dealer", spendProfile: "light" });
    expect(findProfileByNameV3("asmo")?.name).toBe("Ａsmo");
    expect(findProfileByNameV3("unknown")).toBeUndefined();
  });

  it("exports and restores portable profiles without replacing a newer local copy", () => {
    saveProfileV3({ name: "본계정", state, activeDeckIds: ["plain"], deckGoal: "dealer", spendProfile: "light" }, "main");
    const backup = createProfileBackupV55();
    localStorage.clear();
    const restored = importProfileBackupV55(JSON.stringify(backup));
    expect(restored.imported).toBe(1);
    expect(listProfilesV3()[0].name).toBe("본계정");

    saveProfileV3({ name: "더 최신 본계정", state, activeDeckIds: ["plain"], deckGoal: "dealer", spendProfile: "light" }, "main");
    expect(importProfileBackupV55(JSON.stringify(backup)).skipped).toBe(1);
    expect(listProfilesV3()[0].name).toBe("더 최신 본계정");
  });

  it("rejects malformed backups", () => {
    expect(() => importProfileBackupV55("{bad json")).toThrow("INVALID_PROFILE_BACKUP");
  });
});

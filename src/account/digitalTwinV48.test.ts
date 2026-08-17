import { describe, expect, it } from "vitest";
import { createDigitalTwinV48, isDigitalTwinV48 } from "./digitalTwinV48";
import type { PlannerStateV3 } from "../planner-v3/types";

const state: PlannerStateV3 = {
  schemaVersion: 3, dataVersion: "test", ownedRanks: {}, simulatedRanks: {}, inventory: { gold: 100, stone: 2 },
  scenario: { diceId: "predator", diceProgressionLevel: 4, battleUpgradeLevel: 1, conditionValues: {}, enemyPresetId: "custom", durationSeconds: 30 },
};

describe("User Digital Twin V4.8", () => {
  it("migrates the current planner and deck without losing account state", () => {
    const twin = createDigitalTwinV48({ planner: state, activeDeckIds: ["predator", "light", "adjust", "switch", "decay"], deckGoal: "dealer", spendProfile: "light" });
    expect(isDigitalTwinV48(twin)).toBe(true);
    expect(twin.planner.inventory.gold).toBe(100);
    expect(twin.decks[0].diceIds).toHaveLength(5);
    expect(twin.roster.predator.level).toBe(4);
  });
});

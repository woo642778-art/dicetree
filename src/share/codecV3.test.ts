import { describe, expect, it } from "vitest";
import type { PlannerStateV3 } from "../planner-v3/types";
import { decodeV3, encodeV3 } from "./codecV3";
import { migrateV2ToV3 } from "./migrateV2ToV3";

const options = {
  validNodeIds: new Set(["5007", "5207"]),
  maxRanks: new Map([
    ["5007", 1],
    ["5207", 50],
  ]),
  validDiceIds: new Set(["predator", "decay", "bingo"]),
};

const state = (): PlannerStateV3 => ({
  schemaVersion: 3,
  dataVersion: "rd2-1.0.1",
  ownedRanks: { "5007": 1, "5207": 5 },
  simulatedRanks: { "5207": 8 },
  inventory: { gold: 123456, stone: 17 },
  scenario: {
    diceId: "predator",
    diceProgressionLevel: 10,
    battleUpgradeLevel: 5,
    conditionValues: { predatorStacks: 7, boss: true, label: "test" },
    enemyPresetId: "4",
    enemyHpOverride: 5000000,
    durationSeconds: 30,
  },
});

describe("V3 share codec", () => {
  it("round-trips semantic V3 state", () => {
    const encoded = encodeV3(state());
    const decoded = decodeV3(encoded, options);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state).toEqual(state());
    expect(decoded.warnings).toEqual([]);
  });

  it("is deterministic regardless of rank and condition insertion order", () => {
    const first = state();
    const second = state();
    second.ownedRanks = { "5207": 5, "5007": 1 };
    second.scenario.conditionValues = { label: "test", boss: true, predatorStacks: 7 };
    expect(encodeV3(first)).toBe(encodeV3(second));
  });

  it("drops unknown shared nodes with a warning instead of inventing mappings", () => {
    const input = state();
    input.simulatedRanks.unknown = 7;
    const decoded = decodeV3(encodeV3(input), options);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state.simulatedRanks.unknown).toBeUndefined();
    expect(decoded.warnings).toContain("unknown-simulated-node:unknown");
  });

  it("rejects a malformed scenario instead of repairing combat inputs silently", () => {
    const encoded = encodeV3({
      ...state(),
      scenario: { ...state().scenario, durationSeconds: 0 },
    });
    expect(decodeV3(encoded, options)).toEqual({ ok: false, error: "invalid-v3-scenario" });
  });
});

describe("V2 -> V3 migration", () => {
  it("purges fake V2 currencies and maps known semantic dice aliases only", () => {
    const migrated = migrateV2ToV3({
      schemaVersion: 2,
      dataVersion: "v2",
      planned: { "5007": 1, "synthetic-v2-node": 1 },
      inventory: {
        gold: 80000,
        blueCard: 12,
        redCard: 4,
        prismCube: 9,
      },
      primaryDieId: "devourer",
    }, {
      ...options,
      dataVersion: "rd2-1.0.1",
    });

    expect(migrated).not.toBeNull();
    if (!migrated) return;
    expect(migrated.state.inventory).toEqual({ gold: 80000, stone: 0 });
    expect(migrated.state.ownedRanks).toEqual({});
    expect(migrated.state.simulatedRanks).toEqual({ "5007": 1 });
    expect(migrated.state.scenario.diceId).toBe("predator");
    expect(JSON.stringify(migrated.state)).not.toMatch(/blueCard|redCard|prismCube/);
    expect(migrated.warnings).toEqual(expect.arrayContaining([
      "unknown-node:synthetic-v2-node",
      "discarded-v2-resource:blueCard",
      "discarded-v2-resource:redCard",
      "discarded-v2-resource:prismCube",
      "dice-alias:devourer->predator",
    ]));
  });

  it("does not migrate non-V2 objects", () => {
    expect(migrateV2ToV3({ schemaVersion: 3 }, {
      ...options,
      dataVersion: "rd2-1.0.1",
    })).toBeNull();
  });
});

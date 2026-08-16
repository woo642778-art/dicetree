import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../../game-data/load";
import { simulateDiceV3 } from "./simulate";
import type { SimulationInputV3, StatModifierV3 } from "./types";

function input(diceId: string): SimulationInputV3 {
  return {
    diceId,
    diceProgressionLevel: 1,
    battleUpgradeLevel: 1,
    treeRanks: {},
    conditionValues: {},
    enemy: { id: "custom", kind: "custom" },
    durationSeconds: 30,
  };
}

describe("shared V3 simulation engine", () => {
  it("computes a verified neutral basic DPS only when no unresolved path affects it", () => {
    const result = simulateDiceV3(input("wind"), gameDataV3);
    expect(result.stats.attack).toBe(100);
    expect(result.stats.attackInterval).toBe(0.45);
    expect(result.projectedStats?.attack).toBe(100);
    expect(result.projectedStats?.attackInterval).toBe(0.45);
    expect(result.basicAttackDps).toBeCloseTo(100 / 0.45, 10);
    expect(result.projectedBasicAttackDps).toBeCloseTo(100 / 0.45, 10);
    expect(result.practicalDps).toBeCloseTo(100 / 0.45, 10);
    expect(result.confidence).toBe("verified");
  });

  it("projects client LvAdd/UpAdd growth while keeping unverified runtime arithmetic out of exact DPS", () => {
    const scenario = input("predator");
    scenario.diceProgressionLevel = 10;
    scenario.battleUpgradeLevel = 5;
    const result = simulateDiceV3(scenario, gameDataV3);

    expect(result.stats.attack).toBe(1000);
    expect(result.stats.attackInterval).toBe(2.7);
    expect(result.projectedStats?.range).toBeCloseTo(1.65, 10);
    expect(result.projectedStats?.attackInterval).toBeCloseTo(2.38, 10);
    expect(result.projectedBasicAttackDps).toBeCloseTo(1000 / 2.38, 10);
    expect(result.unresolvedStats).toEqual(expect.arrayContaining(["range", "attackInterval"]));
    expect(result.basicAttackDps).toBeNull();
    expect(result.practicalDps).toBeNull();
    expect(result.confidence).toBe("partial");
    const projectedIntervalStep = result.trace.find((step) => step.stat === "attackInterval" && !step.applied);
    expect(projectedIntervalStep).toBeDefined();
    expect(projectedIntervalStep?.outputValue).toBeCloseTo(2.38, 10);
  });

  it("projects attack and interval level changes for a normal dice without promoting them to verified combat DPS", () => {
    const scenario = input("wind");
    scenario.diceProgressionLevel = 2;
    scenario.battleUpgradeLevel = 2;
    const result = simulateDiceV3(scenario, gameDataV3);
    expect(result.stats.attack).toBe(100);
    expect(result.stats.attackInterval).toBe(0.45);
    expect(result.projectedStats?.attack).toBe(300);
    expect(result.projectedStats?.attackInterval).toBeCloseTo(0.425, 10);
    expect(result.projectedBasicAttackDps).toBeCloseTo(300 / 0.425, 10);
    expect(result.basicAttackDps).toBeNull();
    expect(result.practicalDps).toBeNull();
    expect(result.confidence).toBe("partial");
  });

  it("keeps special projectile and skill paths partial until a mechanic module resolves them", () => {
    const result = simulateDiceV3(input("predator"), gameDataV3);
    expect(result.basicAttackDps).toBeCloseTo(1000 / 2.7, 10);
    expect(result.practicalDps).toBeNull();
    expect(result.unresolvedMechanics).toEqual([
      "projectile:Predator",
      "skill:predator",
    ]);
  });

  it("applies verified modifiers in canonical stage order and records the trace", () => {
    const modifiers: StatModifierV3[] = [
      {
        id: "rune-multiply",
        stage: "rune",
        stat: "attack",
        operation: "multiply",
        value: 2,
        confidence: "verified",
        sourceRefs: ["test:rune"],
      },
      {
        id: "tree-add",
        stage: "tree-passive",
        stat: "attack",
        operation: "add",
        value: 20,
        confidence: "verified",
        sourceRefs: ["test:tree"],
      },
    ];
    const result = simulateDiceV3(input("wind"), gameDataV3, { additionalModifiers: modifiers });
    expect(result.stats.attack).toBe(240);
    expect(result.projectedStats?.attack).toBe(240);
    expect(result.trace.map((step) => step.id)).toEqual(["tree-add", "rune-multiply"]);
    expect(result.basicAttackDps).toBeCloseTo(240 / 0.45, 10);
  });

  it("excludes a partial non-growth modifier from both exact and projected arithmetic", () => {
    const result = simulateDiceV3(input("wind"), gameDataV3, {
      additionalModifiers: [{
        id: "unknown-speed-formula",
        stage: "tree-passive",
        stat: "attackInterval",
        operation: "multiply",
        value: 0.8,
        confidence: "partial",
        sourceRefs: ["test:partial"],
      }],
    });
    expect(result.stats.attackInterval).toBe(0.45);
    expect(result.projectedStats?.attackInterval).toBe(0.45);
    expect(result.basicAttackDps).toBeNull();
    expect(result.projectedBasicAttackDps).toBeNull();
    expect(result.trace[0]).toMatchObject({
      applied: false,
      reason: "partial-formula",
    });
  });
});

import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../../game-data/load";
import { simulateDiceWithTreeV3 } from "./simulateTreeAware";

function input(diceId: string, treeRanks: Record<string, number>) {
  return {
    diceId,
    diceProgressionLevel: 1,
    battleUpgradeLevel: 1,
    treeRanks,
    conditionValues: {},
    enemy: { id: "custom", kind: "custom" as const },
    durationSeconds: 30,
  };
}

describe("tree-aware V3 simulation", () => {
  it("shows the verified raw bullet damage bonus but blocks exact DPS until stacking order is proven", () => {
    const result = simulateDiceWithTreeV3(input("predator", { "5109": 3 }), gameDataV3);
    expect(result.stats.bulletDamagePercent).toBeCloseTo(6.2, 10);
    expect(result.basicAttackDps).toBeNull();
    expect(result.unresolvedStats).toContain("attack");
  });

  it("shows verified raw Chaos attack speed and blocks interval-dependent exact DPS", () => {
    const result = simulateDiceWithTreeV3(input("predator", { "5103": 1 }), gameDataV3);
    expect(result.stats.attackSpeedPercent).toBe(5);
    expect(result.basicAttackDps).toBeNull();
    expect(result.unresolvedStats).toContain("attackInterval");
  });

  it("does not let a complex Predator rune disappear into generic arithmetic", () => {
    const result = simulateDiceWithTreeV3(input("predator", { "5207": 10 }), gameDataV3);
    expect(result.tree.unresolvedNodeIds).toEqual(["5207"]);
    expect(result.practicalDps).toBeNull();
  });
});

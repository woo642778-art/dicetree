import { describe, expect, it } from "vitest";
import { gameDataV3 } from "../../game-data/load";
import { mechanicConditionDefinitionsV3, mechanicRuleForDiceV3 } from "./registry";

function evaluate(treeRanks: Record<string, number>, conditionValues: Record<string, number>) {
  const dice = gameDataV3.dice.find((candidate) => candidate.id === "predator")!;
  return mechanicRuleForDiceV3("predator", gameDataV3).evaluate({
    dice,
    data: gameDataV3,
    input: {
      diceId: "predator",
      diceProgressionLevel: 1,
      battleUpgradeLevel: 1,
      treeRanks,
      conditionValues,
      enemy: { id: "custom", kind: "custom" },
      durationSeconds: 30,
    },
  });
}

describe("Predator mechanic rule", () => {
  it("turns the verified PredatorDmgPerStack rune rank into a per-stack value", () => {
    const rank1 = evaluate({ "5207": 1 }, { predatorStacks: 4 });
    expect(rank1.values.damagePerStackPercent).toBe(5);
    expect(rank1.values.damageBonusPercent).toBe(20);

    const rank3 = evaluate({ "5207": 3 }, { predatorStacks: 4 });
    expect(rank3.values.damagePerStackPercent).toBe(15);
    expect(rank3.values.damageBonusPercent).toBe(60);
  });

  it("exposes verified chain-predation probability parameters without using them as full DPS", () => {
    const result = evaluate(
      { "5307": 1 },
      { predatorStacks: 2, predatorAcquisitions: 10 },
    );
    expect(result.values.bonusStackChancePercent).toBe(30);
    expect(result.values.bonusStacksPerProc).toBe(2);
    expect(result.values.expectedBonusStacks).toBe(6);
    expect(result.confidence).toBe("partial");
    expect(result.unresolved).toContain("predator-base-projectile-formula");
  });

  it("pins the Devour the Weak normal-monster HP threshold", () => {
    const result = evaluate({ "5407": 1 }, { predatorStacks: 0 });
    expect(result.values.instantDevourHpThresholdPercent).toBe(5);
  });

  it("shows only conditions that are relevant to the current Predator tree", () => {
    expect(mechanicConditionDefinitionsV3("predator", gameDataV3, { "5207": 4 }).map((item) => item.key))
      .toEqual(["predatorStacks"]);
    expect(mechanicConditionDefinitionsV3("predator", gameDataV3, { "5307": 1 }).map((item) => item.key))
      .toEqual(["predatorStacks", "predatorAcquisitions"]);
  });

  it("provides condition hints for mechanically different dice without inventing formulas", () => {
    expect(mechanicConditionDefinitionsV3("gear", gameDataV3, {}).map((item) => item.key))
      .toEqual(["adjacentGearDice"]);
    expect(mechanicConditionDefinitionsV3("bingo", gameDataV3, {}).map((item) => item.key))
      .toEqual(["horizontalTaegeuk", "verticalTaegeuk"]);
    expect(mechanicRuleForDiceV3("gear", gameDataV3).evaluate({
      dice: gameDataV3.dice.find((candidate) => candidate.id === "gear")!,
      data: gameDataV3,
      input: {
        diceId: "gear",
        diceProgressionLevel: 1,
        battleUpgradeLevel: 1,
        treeRanks: {},
        conditionValues: { adjacentGearDice: 3 },
        enemy: { id: "custom", kind: "custom" },
        durationSeconds: 30,
      },
    }).confidence).toBe("partial");
  });
});

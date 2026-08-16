import type { DiceDefinitionV3, DiceGrowthRuleV3 } from "../../game-data/types";
import type { StatModifierV3 } from "./types";

function ruleModifier(
  dice: DiceDefinitionV3,
  rule: DiceGrowthRuleV3,
  stage: "permanent-growth" | "battle-upgrade",
  levelDelta: number,
  index: number,
): StatModifierV3 | null {
  if (levelDelta <= 0 || rule.perLevel === 0) return null;
  return {
    id: `${dice.id}:${stage}:${rule.stat}:${index}`,
    stage,
    stat: rule.stat,
    operation: rule.operation,
    value: rule.operation === "multiply"
      ? Math.pow(rule.perLevel, levelDelta)
      : rule.perLevel * levelDelta,
    confidence: rule.confidence,
    sourceRefs: rule.sourceRefs,
  };
}

export function growthModifiersForDice(
  dice: DiceDefinitionV3,
  diceProgressionLevel: number,
  battleUpgradeLevel: number,
): StatModifierV3[] {
  if (!Number.isInteger(diceProgressionLevel) || diceProgressionLevel < 1) {
    throw new RangeError(`diceProgressionLevel must be an integer >= 1, got ${diceProgressionLevel}`);
  }
  if (!Number.isInteger(battleUpgradeLevel) || battleUpgradeLevel < 1) {
    throw new RangeError(`battleUpgradeLevel must be an integer >= 1, got ${battleUpgradeLevel}`);
  }

  return [
    ...dice.levelGrowth.map((rule, index) => ruleModifier(
      dice,
      rule,
      "permanent-growth",
      diceProgressionLevel - 1,
      index,
    )),
    ...dice.battleUpgradeGrowth.map((rule, index) => ruleModifier(
      dice,
      rule,
      "battle-upgrade",
      battleUpgradeLevel - 1,
      index,
    )),
  ].filter((modifier): modifier is StatModifierV3 => modifier !== null);
}

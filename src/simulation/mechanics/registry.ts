import type { CanonicalGameData, DiceDefinitionV3 } from "../../game-data/types";
import { predatorMechanicRuleV3 } from "./predator";
import type { ConditionDefinitionV3, DiceMechanicRuleV3 } from "./types";

const CONDITION_HINTS: Record<string, ConditionDefinitionV3[]> = {
  gear: [{ key: "adjacentGearDice", labelKey: "sim_condition_adjacent_gear", type: "number", defaultValue: 0, min: 0, max: 8, step: 1 }],
  combo: [{ key: "comboStacks", labelKey: "sim_condition_combo_stacks", type: "number", defaultValue: 0, min: 0, step: 1 }],
  bingo: [
    { key: "horizontalTaegeuk", labelKey: "sim_condition_taeguk_horizontal", type: "boolean", defaultValue: false },
    { key: "verticalTaegeuk", labelKey: "sim_condition_taeguk_vertical", type: "boolean", defaultValue: false },
  ],
  solitude: [
    { key: "emptyAdjacentTiles", labelKey: "sim_condition_empty_adjacent", type: "number", defaultValue: 0, min: 0, max: 8, step: 1 },
    { key: "emptyFieldTiles", labelKey: "sim_condition_empty_field", type: "number", defaultValue: 0, min: 0, step: 1 },
  ],
  neon: [{ key: "neonDiceCount", labelKey: "sim_condition_neon_count", type: "number", defaultValue: 1, min: 1, max: 15, step: 1 }],
  resonance: [{ key: "sameDotResonanceCount", labelKey: "sim_condition_resonance_count", type: "number", defaultValue: 1, min: 1, max: 15, step: 1 }],
  alignment: [{ key: "alignmentStacks", labelKey: "sim_condition_alignment_stacks", type: "number", defaultValue: 0, min: 0, step: 1 }],
  tyrant: [{ key: "tyrantConsumeStacks", labelKey: "sim_condition_tyrant_stacks", type: "number", defaultValue: 0, min: 0, step: 1 }],
  poison: [{ key: "poisonStacks", labelKey: "sim_condition_poison_stacks", type: "number", defaultValue: 0, min: 0, step: 1 }],
  ray: [{ key: "laserDurationSeconds", labelKey: "sim_condition_laser_duration", type: "number", defaultValue: 0, min: 0, step: 0.1 }],
  sniper: [{ key: "targetDistance", labelKey: "sim_condition_target_distance", type: "number", defaultValue: 0, min: 0, step: 0.1 }],
  energy: [{ key: "currentSp", labelKey: "sim_condition_current_sp", type: "number", defaultValue: 0, min: 0, step: 1 }],
  potion: [{ key: "potionStacks", labelKey: "sim_condition_potion_stacks", type: "number", defaultValue: 0, min: 0, step: 1 }],
  flower: [{ key: "dotCount", labelKey: "sim_condition_dot_count", type: "number", defaultValue: 1, min: 1, max: 7, step: 1 }],
  iron: [{ key: "bossHitCount", labelKey: "sim_condition_boss_hits", type: "number", defaultValue: 0, min: 0, step: 1 }],
};

function unresolvedKeys(dice: DiceDefinitionV3): string[] {
  const keys: string[] = [];
  if (dice.mechanicRuleId) keys.push(`skill:${dice.mechanicRuleId}`);
  const projectile = dice.baseStats.extra.ProjectileAbilityId;
  if (typeof projectile === "string" && projectile) keys.push(`projectile:${projectile}`);
  return [...new Set(keys)].sort();
}

function genericRule(dice: DiceDefinitionV3): DiceMechanicRuleV3 {
  return {
    diceId: dice.id,
    requiredConditions() {
      return CONDITION_HINTS[dice.id] ?? [];
    },
    evaluate(ctx) {
      const unresolved = unresolvedKeys(dice);
      return {
        confidence: unresolved.length ? "partial" : "verified",
        values: { ...ctx.input.conditionValues },
        unresolved: unresolved.length ? unresolved.map((key) => `unresolved-${key}`) : [],
        sourceRefs: dice.sourceRefs,
      };
    },
  };
}

const EXPLICIT_RULES: Record<string, DiceMechanicRuleV3> = {
  predator: predatorMechanicRuleV3,
};

export function mechanicRuleForDiceV3(
  diceId: string,
  data: CanonicalGameData,
): DiceMechanicRuleV3 {
  const explicit = EXPLICIT_RULES[diceId];
  if (explicit) return explicit;
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  if (!dice) throw new Error(`Unknown dice id: ${diceId}`);
  return genericRule(dice);
}

export function mechanicConditionDefinitionsV3(
  diceId: string,
  data: CanonicalGameData,
  treeRanks: Record<string, number>,
): ConditionDefinitionV3[] {
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  if (!dice) throw new Error(`Unknown dice id: ${diceId}`);
  return mechanicRuleForDiceV3(diceId, data).requiredConditions({
    dice,
    data,
    treeRanks,
  });
}

import type { CanonicalGameData } from "../../game-data/types";
import type {
  ConditionDefinitionV3,
  DiceMechanicRuleV3,
  MechanicContextV3,
  MechanicEvaluationV3,
} from "./types";
import { runeNumberAtRank } from "./runeValues";

const PREDATOR_DAMAGE_NODE = "5207";
const CHAIN_PREDATION_NODE = "5307";
const WEAK_PREDATION_NODE = "5407";

function runeForNode(data: CanonicalGameData, nodeId: string) {
  const node = data.tree.find((candidate) => candidate.id === nodeId);
  const runeRef = node?.passiveOrRuneRef;
  if (!runeRef?.startsWith("rune:")) return undefined;
  return data.runes.find((rune) => rune.id === runeRef.slice("rune:".length));
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function rankOf(treeRanks: Record<string, number>, nodeId: string): number {
  const rank = treeRanks[nodeId] ?? 0;
  return Number.isInteger(rank) && rank >= 0 ? rank : 0;
}

export const predatorMechanicRuleV3: DiceMechanicRuleV3 = {
  diceId: "predator",

  requiredConditions({ data, treeRanks }): ConditionDefinitionV3[] {
    const conditions: ConditionDefinitionV3[] = [{
      key: "predatorStacks",
      labelKey: "sim_condition_predator_stacks",
      type: "number",
      defaultValue: 0,
      min: 0,
      step: 1,
    }];

    if (rankOf(treeRanks, CHAIN_PREDATION_NODE) > 0 && runeForNode(data, CHAIN_PREDATION_NODE)) {
      conditions.push({
        key: "predatorAcquisitions",
        labelKey: "sim_condition_predator_acquisitions",
        type: "number",
        defaultValue: 0,
        min: 0,
        step: 1,
      });
    }
    return conditions;
  },

  evaluate(ctx: MechanicContextV3): MechanicEvaluationV3 {
    const stacks = nonNegativeNumber(ctx.input.conditionValues.predatorStacks);
    const acquisitions = nonNegativeNumber(ctx.input.conditionValues.predatorAcquisitions);
    const damageRank = rankOf(ctx.input.treeRanks, PREDATOR_DAMAGE_NODE);
    const chainRank = rankOf(ctx.input.treeRanks, CHAIN_PREDATION_NODE);
    const weakRank = rankOf(ctx.input.treeRanks, WEAK_PREDATION_NODE);

    const damageRune = runeForNode(ctx.data, PREDATOR_DAMAGE_NODE);
    const chainRune = runeForNode(ctx.data, CHAIN_PREDATION_NODE);
    const weakRune = runeForNode(ctx.data, WEAK_PREDATION_NODE);

    const damagePerStackPercent = damageRune
      ? runeNumberAtRank(damageRune, damageRank, "Value1")
      : null;
    const damageBonusPercent = damagePerStackPercent === null
      ? null
      : damagePerStackPercent * stacks;
    const bonusStackChancePercent = chainRune
      ? runeNumberAtRank(chainRune, chainRank, "Value1")
      : null;
    const bonusStacksPerProc = chainRune
      ? runeNumberAtRank(chainRune, chainRank, "Value2")
      : null;
    const expectedBonusStacks = bonusStackChancePercent === null || bonusStacksPerProc === null
      ? null
      : acquisitions * (bonusStackChancePercent / 100) * bonusStacksPerProc;
    const instantDevourHpThresholdPercent = weakRune
      ? runeNumberAtRank(weakRune, weakRank, "Value1")
      : null;

    const sourceRefs = [
      ...(damageRune?.sourceRefs ?? []),
      ...(chainRune?.sourceRefs ?? []),
      ...(weakRune?.sourceRefs ?? []),
      "ipa-table:ProjectileAbilityTable:Predator",
      "il2cpp:PredatorDmgPerStack",
      "il2cpp:BonusPredatorChance",
      "il2cpp:InstaPredatorHpThreshold",
    ];

    return {
      // Rune values and descriptions are verified. The base Predator projectile formula,
      // stacking order versus other DMG bonuses, and timing remain unresolved.
      confidence: "partial",
      values: {
        predatorStacks: stacks,
        predatorAcquisitions: acquisitions,
        damagePerStackPercent,
        damageBonusPercent,
        bonusStackChancePercent,
        bonusStacksPerProc,
        expectedBonusStacks,
        instantDevourHpThresholdPercent,
      },
      unresolved: [
        "predator-base-projectile-formula",
        "predator-damage-stacking-order",
        "predator-stack-timing",
      ],
      sourceRefs: [...new Set(sourceRefs)].sort(),
    };
  },
};

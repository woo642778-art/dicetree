import type {
  CanonicalGameData,
  DiceDefinitionV3,
  PassiveDefinitionV3,
  RuneDefinitionV3,
} from "../../game-data/types";
import { runeNumberAtRank } from "../mechanics/runeValues";
import type { StatModifierV3 } from "../engine/types";

export interface TreeModifierCollectionV3 {
  modifiers: StatModifierV3[];
  unresolvedNodeIds: string[];
}

function passiveValueAtRank(passive: PassiveDefinitionV3, rank: number): number | null {
  if (rank <= 0) return null;
  if (rank > passive.maxRank) throw new RangeError(`Passive ${passive.id} rank ${rank} exceeds max ${passive.maxRank}`);
  if (passive.baseValue === undefined || passive.baseValue === null) return null;
  return passive.baseValue + (rank - 1) * (passive.valuePerRank ?? 0);
}

function passiveAppliesToDice(passive: PassiveDefinitionV3, dice: DiceDefinitionV3): boolean {
  if (passive.scope === "global") return true;
  if (passive.scope === "dice") return Boolean(passive.targetDiceIds?.includes(dice.id));
  return passive.scope === dice.family;
}

function simplePassiveStat(passive: PassiveDefinitionV3): string | null {
  if (passive.id === "DiceAttackUp") return "flatBulletDamage";
  if (passive.id.includes("CritDmgUpPer")) return "critDamagePercent";
  if (passive.id.includes("CritPerUpPer")) return "critRatePercent";
  if (passive.id.includes("AtkSpeedUpPer")) return "attackSpeedPercent";
  if (passive.id.includes("AttackUpPer") || passive.id.includes("DiceAttackUpPer")) return "bulletDamagePercent";
  return null;
}

function simpleRuneStat(rune: RuneDefinitionV3): string | null {
  if (rune.kind === "BulletAtkPercentUp") return "bulletDamagePercent";
  if (rune.kind === "BulletAtkSpeedPercentUp") return "attackSpeedPercent";
  return null;
}

function guardModifier(
  nodeId: string,
  stat: string,
  sourceRefs: string[],
): StatModifierV3 | null {
  if (stat === "bulletDamagePercent" || stat === "flatBulletDamage") {
    return {
      id: `tree:${nodeId}:attack-formula-guard`,
      stage: "tree-passive",
      stat: "attack",
      operation: "add",
      value: 0,
      confidence: "partial",
      sourceRefs,
    };
  }
  if (stat === "attackSpeedPercent") {
    return {
      id: `tree:${nodeId}:interval-formula-guard`,
      stage: "tree-passive",
      stat: "attackInterval",
      operation: "add",
      value: 0,
      confidence: "partial",
      sourceRefs,
    };
  }
  if (stat === "critRatePercent" || stat === "critDamagePercent") {
    return {
      id: `tree:${nodeId}:crit-formula-guard`,
      stage: "tree-passive",
      stat: "criticalExpectedDamage",
      operation: "add",
      value: 0,
      confidence: "partial",
      sourceRefs,
    };
  }
  return null;
}

function rawStatModifier(
  nodeId: string,
  stat: string,
  value: number,
  sourceRefs: string[],
): StatModifierV3 {
  return {
    id: `tree:${nodeId}:${stat}`,
    stage: "tree-passive",
    stat,
    operation: "add",
    value,
    confidence: "verified",
    sourceRefs,
  };
}

function addSimpleEffect(
  modifiers: StatModifierV3[],
  nodeId: string,
  stat: string,
  value: number,
  sourceRefs: string[],
) {
  modifiers.push(rawStatModifier(nodeId, stat, value, sourceRefs));
  const guard = guardModifier(nodeId, stat, sourceRefs);
  if (guard) modifiers.push(guard);
}

export function collectTreeModifiersV3(
  data: CanonicalGameData,
  diceId: string,
  treeRanks: Record<string, number>,
): TreeModifierCollectionV3 {
  const dice = data.dice.find((candidate) => candidate.id === diceId);
  if (!dice) throw new Error(`Unknown dice id: ${diceId}`);

  const passiveById = new Map(data.passives.map((passive) => [passive.id, passive]));
  const runeById = new Map(data.runes.map((rune) => [rune.id, rune]));
  const nodeById = new Map(data.tree.map((node) => [node.id, node]));
  const modifiers: StatModifierV3[] = [];
  const unresolved = new Set<string>();

  for (const [nodeId, rank] of Object.entries(treeRanks).sort(([a], [b]) => a.localeCompare(b))) {
    if (!Number.isInteger(rank) || rank <= 0) continue;
    const node = nodeById.get(nodeId);
    if (!node) throw new Error(`Unknown Dice Tree node in simulation: ${nodeId}`);
    if (rank > node.maxRank) throw new RangeError(`Node ${nodeId} rank ${rank} exceeds max ${node.maxRank}`);
    const linked = node.passiveOrRuneRef;
    if (!linked) continue;

    if (linked.startsWith("passive:")) {
      const passive = passiveById.get(linked.slice("passive:".length));
      if (!passive || !passiveAppliesToDice(passive, dice)) continue;
      const stat = simplePassiveStat(passive);
      const value = passiveValueAtRank(passive, rank);
      if (!stat || value === null) {
        unresolved.add(nodeId);
        continue;
      }
      addSimpleEffect(modifiers, nodeId, stat, value, passive.sourceRefs);
      continue;
    }

    if (linked.startsWith("rune:")) {
      const rune = runeById.get(linked.slice("rune:".length));
      if (!rune || (rune.targetDiceId && rune.targetDiceId !== dice.id)) continue;
      const stat = simpleRuneStat(rune);
      const value = stat ? runeNumberAtRank(rune, rank, "Value1") : null;
      if (!stat || value === null) {
        // Dice-specific mechanic modules own non-trivial runes such as PredatorDmgPerStack.
        unresolved.add(nodeId);
        continue;
      }
      addSimpleEffect(modifiers, nodeId, stat, value, rune.sourceRefs);
    }
  }

  return {
    modifiers,
    unresolvedNodeIds: [...unresolved].sort(),
  };
}

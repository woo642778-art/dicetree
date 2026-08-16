import { RD2_EXTRACTED_DATA } from "./rd2ExtractedData";

export type RD2Family = "nature" | "engineering" | "magic" | "order" | "chaos";
export type RD2TreeNodeType = "DICE" | "DICE_RUNE" | "PLAYER_PASSIVE" | "PERK";
export type Locale = "ko" | "en";
export interface LocalizedValue { ko: string; en: string }

export interface RD2TreeNode {
  id: number;
  index: number;
  position: { x: number; y: number };
  nodeType: RD2TreeNodeType;
  kindId: number;
  family: RD2Family;
  isBig: boolean;
  isBase: boolean;
  isShow: boolean;
  nextNodeIds: readonly number[];
  unlockCondition: string | null;
  unlockConditionValue: number | null;
  goldByRank: readonly number[];
  nodeStoneByRank: readonly number[];
  maxRank: number;
  intrinsicMaxRank: number;
  name: LocalizedValue;
  description: LocalizedValue;
  effectKind: string;
  effectBase: number;
  effectRankAdd: number;
  diceType?: string;
}

export interface RD2DiceDefinition {
  numericId: number;
  type: string;
  use: boolean;
  family: RD2Family;
  groupInternal: string;
  targetingType: string;
  attackType: string;
  attack: number;
  attackLevelAdd: number;
  attackUpgradeAdd: number;
  range: number;
  rangeLevelAdd: number;
  rangeUpgradeAdd: number;
  attackInterval: number;
  attackIntervalUpgradeAdd: number;
  bossAttackPercent: number;
  bossAttackPercentUpgradeAdd: number;
  cooldown: number;
  cooldownLevelAdd: number;
  projectileAbilityId: string;
  skillKinds: readonly string[];
  name: LocalizedValue;
  description: LocalizedValue;
  level7Description: LocalizedValue;
}

export interface RD2RuneDefinition {
  id: number;
  kind: string;
  grade: string;
  use: boolean;
  maxRank: number;
  value1: number;
  value1RankAdd: number;
  value2: number;
  value2RankAdd: number;
  duration: number;
  durationRankAdd: number;
  diceType: string;
  family: RD2Family;
  name: LocalizedValue;
  description: LocalizedValue;
}

export interface RD2PassiveDefinition {
  numericId: number;
  kind: string;
  family: RD2Family | "core";
  groupInternal: string;
  maxRank: number;
  value: number;
  valueRankAdd: number;
  valueType: string;
  name: LocalizedValue;
  description: LocalizedValue;
}

export interface RD2PerkDefinition {
  numericId: number;
  kind: string;
  family: RD2Family;
  groupInternal: string;
  maxCount: number;
  startDelay: number;
  delay: number;
  passiveId: number;
  name: LocalizedValue;
  description: LocalizedValue;
  passiveDescription: LocalizedValue;
  flavor: LocalizedValue;
}

export interface RD2ProjectileAbility {
  id: string;
  value: number;
  valueLevelAdd: number;
  valueUpgradeAdd: number;
  duration: number;
  durationLevelAdd: number;
  durationUpgradeAdd: number;
  range: number;
  rangeLevelAdd: number;
  rangeUpgradeAdd: number;
  stackMax: number;
  stackMaxLevelAdd: number;
  stackMaxUpgradeAdd: number;
  valueLabel: LocalizedValue;
  durationLabel: LocalizedValue;
  rangeLabel: LocalizedValue;
  stackLabel: LocalizedValue;
}

export const TREE_RESOURCE_IDS = ["gold", "nodeStone"] as const;
export type TreeResourceId = (typeof TREE_RESOURCE_IDS)[number];

export const rd2Source = RD2_EXTRACTED_DATA.source;
export const rd2TreeNodes = RD2_EXTRACTED_DATA.treeNodes as unknown as readonly RD2TreeNode[];
export const rd2Dice = RD2_EXTRACTED_DATA.dice as unknown as readonly RD2DiceDefinition[];
export const rd2Runes = RD2_EXTRACTED_DATA.runes as unknown as readonly RD2RuneDefinition[];
export const rd2Passives = RD2_EXTRACTED_DATA.passives as unknown as readonly RD2PassiveDefinition[];
export const rd2Perks = RD2_EXTRACTED_DATA.perks as unknown as readonly RD2PerkDefinition[];
export const rd2ProjectileAbilities = RD2_EXTRACTED_DATA.projectileAbilities as unknown as readonly RD2ProjectileAbility[];
export const rd2Constants = RD2_EXTRACTED_DATA.constants;

const diceByType = new Map(rd2Dice.map((dice) => [dice.type, dice]));
const runeById = new Map(rd2Runes.map((rune) => [rune.id, rune]));
const passiveById = new Map(rd2Passives.map((passive) => [passive.numericId, passive]));
const perkById = new Map(rd2Perks.map((perk) => [perk.numericId, perk]));
const nodeById = new Map(rd2TreeNodes.map((node) => [node.id, node]));

export function getDiceDefinition(type: string): RD2DiceDefinition {
  const dice = diceByType.get(type);
  if (!dice) throw new Error(`Unknown dice type: ${type}`);
  return dice;
}

export function getRuneDefinitionsForDice(type: string): RD2RuneDefinition[] {
  return rd2Runes.filter((rune) => rune.diceType === type && rune.use);
}

export function getTreeNode(id: number): RD2TreeNode | undefined {
  return nodeById.get(id);
}

export function getTreeNodeForDice(type: string): RD2TreeNode | undefined {
  return rd2TreeNodes.find((node) => node.nodeType === "DICE" && node.diceType === type);
}

export function getTreeNodesForDice(type: string): RD2TreeNode[] {
  const direct = new Set<number>();
  const diceNode = getTreeNodeForDice(type);
  if (diceNode) direct.add(diceNode.id);
  for (const node of rd2TreeNodes) {
    if (node.nodeType === "DICE_RUNE" && node.diceType === type) direct.add(node.id);
  }
  return rd2TreeNodes.filter((node) => direct.has(node.id));
}

export function getPassiveDefinition(node: RD2TreeNode): RD2PassiveDefinition | undefined {
  return node.nodeType === "PLAYER_PASSIVE" ? passiveById.get(node.kindId) : undefined;
}

export function getRuneDefinition(node: RD2TreeNode): RD2RuneDefinition | undefined {
  return node.nodeType === "DICE_RUNE" ? runeById.get(node.kindId) : undefined;
}

export function getPerkDefinition(node: RD2TreeNode) {
  return node.nodeType === "PERK" ? perkById.get(node.kindId) : undefined;
}

export function valueAtRank(base: number, rankAdd: number, rank: number): number {
  if (rank <= 0) return 0;
  return base + rankAdd * (rank - 1);
}

export function rankCost(node: RD2TreeNode, rank: number): { gold: number; nodeStone: number } {
  if (rank < 1 || rank > node.maxRank) return { gold: 0, nodeStone: 0 };
  return {
    gold: node.goldByRank[rank - 1] ?? 0,
    nodeStone: node.nodeStoneByRank[rank - 1] ?? 0,
  };
}

export function cumulativeNodeCost(node: RD2TreeNode, rank: number): { gold: number; nodeStone: number } {
  const capped = Math.max(0, Math.min(rank, node.maxRank));
  let gold = 0;
  let nodeStone = 0;
  for (let i = 0; i < capped; i += 1) {
    gold += node.goldByRank[i] ?? 0;
    nodeStone += node.nodeStoneByRank[i] ?? 0;
  }
  return { gold, nodeStone };
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function cleanRichText(value: string): string {
  return value
    .replace(/<color=[^>]+>/gi, "")
    .replace(/<\/color>/gi, "")
    .replace(/<tag>(.*?)<\/tag>/gi, "$1")
    .replace(/<tag>(.*?)<\/tag>/gi, "$1")
    .replace(/<tag>([^<]*)<\/tag>/gi, "$1")
    .replace(/<tag>(.*?)$/gi, "$1")
    .replace(/<[^>]+>/g, "");
}

function replaceToken(text: string, index: number, value: number | string) {
  return text.replaceAll(`{${index}}`, String(value));
}

export function nodeEffectText(node: RD2TreeNode, rank: number, locale: Locale): string {
  const safeRank = Math.max(1, Math.min(rank || 1, node.maxRank));
  let text = node.description[locale] || node.description.ko || node.name[locale] || node.name.ko;

  if (node.nodeType === "PLAYER_PASSIVE") {
    const passive = getPassiveDefinition(node);
    if (passive) {
      const current = valueAtRank(passive.value, passive.valueRankAdd, safeRank);
      text = replaceToken(text, 0, formatNumber(current));
      text = replaceToken(text, 1, formatNumber(passive.valueRankAdd));
    }
  } else if (node.nodeType === "DICE_RUNE") {
    const rune = getRuneDefinition(node);
    if (rune) {
      const v1 = valueAtRank(rune.value1, rune.value1RankAdd, safeRank);
      const v2 = valueAtRank(rune.value2, rune.value2RankAdd, safeRank);
      const duration = valueAtRank(rune.duration, rune.durationRankAdd, safeRank);
      text = replaceToken(text, 0, formatNumber(v1));
      text = replaceToken(text, 1, formatNumber(rune.value1RankAdd || v2));
      text = replaceToken(text, 2, formatNumber(v2));
      text = replaceToken(text, 3, formatNumber(duration));
    }
  }

  return cleanRichText(text).replace(/\s+/g, " ").trim();
}

export function familyLabel(family: RD2Family, locale: Locale): string {
  const labels: Record<RD2Family, { ko: string; en: string }> = {
    nature: { ko: "자연", en: "Nature" },
    engineering: { ko: "공학", en: "Engineer" },
    magic: { ko: "마법", en: "Magic" },
    order: { ko: "질서", en: "Order" },
    chaos: { ko: "혼돈", en: "Chaos" },
  };
  return labels[family][locale];
}

export function firstRankCostWeight(node: RD2TreeNode): number {
  const cost = rankCost(node, 1);
  // This is only a route ordering heuristic; Gold and Dice Core remain separate in displayed totals.
  return cost.gold + cost.nodeStone * 12000;
}

export function getIncomingNodeIds(): Map<number, number[]> {
  const incoming = new Map<number, number[]>();
  for (const node of rd2TreeNodes) incoming.set(node.id, []);
  for (const node of rd2TreeNodes) {
    for (const next of node.nextNodeIds) incoming.get(next)?.push(node.id);
  }
  return incoming;
}

export function getBranchRoots(): RD2TreeNode[] {
  const incoming = getIncomingNodeIds();
  return rd2TreeNodes.filter((node) => (incoming.get(node.id)?.length ?? 0) === 0);
}

export function shortestUnlockPath(targetNodeId: number): number[] {
  const roots = getBranchRoots();
  const distances = new Map<number, number>();
  const previous = new Map<number, number>();
  const unvisited = new Set(rd2TreeNodes.map((node) => node.id));
  for (const root of roots) distances.set(root.id, firstRankCostWeight(root));

  while (unvisited.size) {
    let current: number | undefined;
    let best = Number.POSITIVE_INFINITY;
    for (const id of unvisited) {
      const distance = distances.get(id) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        current = id;
      }
    }
    if (current === undefined || !Number.isFinite(best)) break;
    unvisited.delete(current);
    if (current === targetNodeId) break;
    const node = nodeById.get(current);
    if (!node) continue;
    for (const nextId of node.nextNodeIds) {
      if (!unvisited.has(nextId)) continue;
      const next = nodeById.get(nextId);
      if (!next) continue;
      const nextDistance = best + firstRankCostWeight(next);
      if (nextDistance < (distances.get(nextId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextId, nextDistance);
        previous.set(nextId, current);
      }
    }
  }

  if (!distances.has(targetNodeId)) return [targetNodeId];
  const path = [targetNodeId];
  let cursor = targetNodeId;
  while (previous.has(cursor)) {
    cursor = previous.get(cursor)!;
    path.push(cursor);
  }
  return path.reverse();
}

export function focusRecommendationIds(type: string): Set<number> {
  const ids = new Set<number>();
  const dice = getDiceDefinition(type);
  const diceNode = getTreeNodeForDice(type);
  if (diceNode) {
    shortestUnlockPath(diceNode.id).forEach((id) => ids.add(id));
    ids.add(diceNode.id);
  }

  const runeNodes = rd2TreeNodes.filter((node) => node.nodeType === "DICE_RUNE" && node.diceType === type);
  for (const runeNode of runeNodes) {
    shortestUnlockPath(runeNode.id).forEach((id) => ids.add(id));
    ids.add(runeNode.id);
  }

  const groupInternal = dice.groupInternal;
  for (const node of rd2TreeNodes) {
    if (node.nodeType !== "PLAYER_PASSIVE") continue;
    const passive = getPassiveDefinition(node);
    if (!passive) continue;
    const kind = passive.kind;
    const globalCombat = /^Dice(AttackUp|AttackUpPer|AtkSpeedUpPer|CritDmgUpPer)/.test(kind);
    const familyCombat = passive.groupInternal === groupInternal &&
      /(AttackUpPer|AtkSpeedUpPer|CritPerUpPer|CritDmgUpPer)/.test(kind);
    if (globalCombat || familyCombat) ids.add(node.id);
  }
  return ids;
}

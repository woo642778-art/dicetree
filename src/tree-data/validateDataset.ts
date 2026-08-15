import type { DiceDefinition, EffectDefinition, TreeNodeDefinition } from "../domain/types";

export interface DatasetValidationResult {
  errors: string[];
  warnings: string[];
}

function referencedDice(effect: EffectDefinition): string[] {
  if (typeof effect.appliesTo === "object") return effect.appliesTo.diceIds;
  return [];
}

export function validateDataset(nodes: TreeNodeDefinition[], dice: DiceDefinition[]): DatasetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set<string>();
  const diceIds = new Set(dice.map((d) => d.id));

  for (const node of nodes) {
    if (nodeIds.has(node.id)) errors.push(`duplicate-node-id:${node.id}`);
    nodeIds.add(node.id);
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      errors.push(`invalid-position:${node.id}`);
    }
    if (!Number.isInteger(node.maxRank) || node.maxRank < 1) errors.push(`invalid-max-rank:${node.id}`);
    if (node.verification.status === "unverified" && node.levels.some((l) => l.effects.length > 0)) {
      errors.push(`unverified-node-has-effects:${node.id}`);
    }
    const ranks = new Set<number>();
    for (const level of node.levels) {
      if (ranks.has(level.rank)) errors.push(`duplicate-level-rank:${node.id}:${level.rank}`);
      ranks.add(level.rank);
      if (!Number.isInteger(level.rank) || level.rank < 1 || level.rank > node.maxRank) {
        errors.push(`invalid-level-rank:${node.id}:${level.rank}`);
      }
      for (const [resource, value] of Object.entries(level.costs)) {
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
          errors.push(`invalid-cost:${node.id}:${level.rank}:${resource}`);
        }
      }
      for (const effect of level.effects) {
        for (const dieId of referencedDice(effect)) {
          if (!diceIds.has(dieId)) errors.push(`unknown-effect-die:${node.id}:${dieId}`);
        }
      }
    }
    if (node.investable && node.levels.length === 0) errors.push(`investable-node-no-levels:${node.id}`);
  }

  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      if (!nodeIds.has(prerequisite.nodeId)) {
        errors.push(`unknown-prerequisite:${node.id}:${prerequisite.nodeId}`);
      }
      if (!Number.isInteger(prerequisite.minRank) || prerequisite.minRank < 1) {
        errors.push(`invalid-prerequisite-rank:${node.id}:${prerequisite.nodeId}`);
      }
    }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const p of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(p.nodeId) && walk(p.nodeId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const node of nodes) {
    if (walk(node.id)) {
      errors.push(`prerequisite-cycle:${node.id}`);
      break;
    }
  }

  const dieSeen = new Set<string>();
  for (const die of dice) {
    if (dieSeen.has(die.id)) errors.push(`duplicate-die-id:${die.id}`);
    dieSeen.add(die.id);
  }

  if (nodes.filter((n) => n.verification.status === "unverified").length > 0) {
    warnings.push("dataset-contains-unverified-placeholders");
  }
  return { errors, warnings };
}

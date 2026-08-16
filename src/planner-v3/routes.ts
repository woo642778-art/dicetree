import type { DiceTreeNodeV3, TreeCost } from "../game-data/types";
import { addTreeCosts, treeCostForRange, ZERO_TREE_COST } from "./costs";

export interface PlannedRouteStepV3 {
  nodeId: string;
  fromRank: number;
  toRank: number;
  cost: TreeCost;
  target: boolean;
}

export interface PlannedRouteV3 {
  targetNodeId: string;
  steps: PlannedRouteStepV3[];
  targetRanks: Record<string, number>;
  totalCost: TreeCost;
  prerequisiteCost: TreeCost;
}

export function planNodeRankRouteV3(
  nodes: readonly DiceTreeNodeV3[],
  currentRanks: Record<string, number>,
  targetNodeId: string,
  targetRank: number,
): PlannedRouteV3 {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const targetNode = byId.get(targetNodeId);
  if (!targetNode) throw new Error(`Unknown Dice Tree route target: ${targetNodeId}`);
  if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > targetNode.maxRank) {
    throw new RangeError(`Invalid target rank for ${targetNodeId}: ${targetRank}`);
  }

  const requiredRanks = new Map<string, number>();
  const visiting = new Set<string>();
  const ordered: string[] = [];

  const requireNode = (nodeId: string, rank: number) => {
    const node = byId.get(nodeId);
    if (!node) throw new Error(`Unknown Dice Tree prerequisite: ${nodeId}`);
    if (rank > node.maxRank) throw new RangeError(`Required rank exceeds max for ${nodeId}: ${rank}`);
    requiredRanks.set(nodeId, Math.max(requiredRanks.get(nodeId) ?? 0, rank));
    if (visiting.has(nodeId)) throw new Error(`Dice Tree prerequisite cycle at ${nodeId}`);
    visiting.add(nodeId);
    for (const prerequisite of node.prerequisites) {
      requireNode(prerequisite.nodeId, prerequisite.minRank);
    }
    visiting.delete(nodeId);
    if (!ordered.includes(nodeId)) ordered.push(nodeId);
  };

  requireNode(targetNodeId, targetRank);

  const steps: PlannedRouteStepV3[] = [];
  let totalCost: TreeCost = { ...ZERO_TREE_COST };
  let prerequisiteCost: TreeCost = { ...ZERO_TREE_COST };
  const targetRanks: Record<string, number> = {};

  for (const nodeId of ordered) {
    const node = byId.get(nodeId)!;
    const fromRank = currentRanks[nodeId] ?? 0;
    const toRank = requiredRanks.get(nodeId)!;
    if (fromRank >= toRank) continue;
    const cost = treeCostForRange(node, fromRank, toRank);
    const target = nodeId === targetNodeId;
    steps.push({ nodeId, fromRank, toRank, cost, target });
    targetRanks[nodeId] = toRank;
    totalCost = addTreeCosts(totalCost, cost);
    if (!target) prerequisiteCost = addTreeCosts(prerequisiteCost, cost);
  }

  return { targetNodeId, steps, targetRanks, totalCost, prerequisiteCost };
}

export function planNextRankRouteV3(
  nodes: readonly DiceTreeNodeV3[],
  currentRanks: Record<string, number>,
  targetNodeId: string,
) {
  const target = nodes.find((node) => node.id === targetNodeId);
  if (!target) throw new Error(`Unknown Dice Tree route target: ${targetNodeId}`);
  const currentRank = currentRanks[targetNodeId] ?? 0;
  if (currentRank >= target.maxRank) return null;
  return planNodeRankRouteV3(nodes, currentRanks, targetNodeId, currentRank + 1);
}

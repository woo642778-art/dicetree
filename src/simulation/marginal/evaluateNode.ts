import type { CanonicalGameData, DiceTreeNodeV3, TreeCost } from "../../game-data/types";
import { treeCostForRange, ZERO_TREE_COST, addTreeCosts } from "../../planner-v3/costs";
import { simulateDiceWithTreeV3, type TreeAwareSimulationResultV3 } from "../engine/simulateTreeAware";
import type { SimulationInputV3 } from "../engine/types";

export interface MarginalNodeResultV3 {
  nodeId: string;
  beforeDps?: number;
  afterDps?: number;
  absoluteGain?: number;
  percentGain?: number;
  cost: TreeCost;
  gainPerGold?: number;
  gainPerStone?: number;
  prerequisiteCost: TreeCost;
  confidence: "verified" | "partial";
  reasons: string[];
}

export type TreeSimulationFnV3 = (
  input: SimulationInputV3,
  data: CanonicalGameData,
) => TreeAwareSimulationResultV3;

function requiredPrerequisiteRanks(
  node: DiceTreeNodeV3,
  data: CanonicalGameData,
): Map<string, number> {
  const byId = new Map(data.tree.map((candidate) => [candidate.id, candidate]));
  const required = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (current: DiceTreeNodeV3) => {
    if (visiting.has(current.id)) throw new Error(`Dice Tree prerequisite cycle at ${current.id}`);
    visiting.add(current.id);
    for (const prerequisite of current.prerequisites) {
      const prerequisiteNode = byId.get(prerequisite.nodeId);
      if (!prerequisiteNode) throw new Error(`Unknown Dice Tree prerequisite ${prerequisite.nodeId}`);
      required.set(
        prerequisite.nodeId,
        Math.max(required.get(prerequisite.nodeId) ?? 0, prerequisite.minRank),
      );
      visit(prerequisiteNode);
    }
    visiting.delete(current.id);
  };

  visit(node);
  return required;
}

export function prerequisiteCostForNodeV3(
  node: DiceTreeNodeV3,
  treeRanks: Record<string, number>,
  data: CanonicalGameData,
): TreeCost {
  let total: TreeCost = { ...ZERO_TREE_COST };
  for (const [nodeId, requiredRank] of requiredPrerequisiteRanks(node, data)) {
    const prerequisite = data.tree.find((candidate) => candidate.id === nodeId)!;
    const currentRank = treeRanks[nodeId] ?? 0;
    if (currentRank >= requiredRank) continue;
    total = addTreeCosts(total, treeCostForRange(prerequisite, currentRank, requiredRank));
  }
  return total;
}

export function evaluateNodeV3(
  input: SimulationInputV3,
  data: CanonicalGameData,
  nodeId: string,
  simulate: TreeSimulationFnV3 = simulateDiceWithTreeV3,
): MarginalNodeResultV3 {
  const node = data.tree.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Unknown Dice Tree node: ${nodeId}`);

  const currentRank = input.treeRanks[nodeId] ?? 0;
  if (currentRank >= node.maxRank) {
    return {
      nodeId,
      cost: { ...ZERO_TREE_COST },
      prerequisiteCost: { ...ZERO_TREE_COST },
      confidence: "partial",
      reasons: ["node-maxed"],
    };
  }

  const cost = treeCostForRange(node, currentRank, currentRank + 1);
  const prerequisiteCost = prerequisiteCostForNodeV3(node, input.treeRanks, data);
  const before = simulate(input, data);
  const afterInput: SimulationInputV3 = {
    ...input,
    treeRanks: { ...input.treeRanks, [nodeId]: currentRank + 1 },
  };
  const after = simulate(afterInput, data);
  const beforeDps = before.practicalDps ?? undefined;
  const afterDps = after.practicalDps ?? undefined;
  const exact = beforeDps !== undefined
    && afterDps !== undefined
    && before.confidence === "verified"
    && after.confidence === "verified";

  const absoluteGain = exact ? afterDps - beforeDps : undefined;
  const percentGain = exact && beforeDps !== 0 ? (absoluteGain! / beforeDps) * 100 : undefined;
  const reasons: string[] = [];
  if (!exact) reasons.push("needs-mechanic-verification");
  if (before.tree.unresolvedNodeIds.length || after.tree.unresolvedNodeIds.length) {
    reasons.push("unresolved-tree-effect");
  }

  return {
    nodeId,
    ...(beforeDps !== undefined ? { beforeDps } : {}),
    ...(afterDps !== undefined ? { afterDps } : {}),
    ...(absoluteGain !== undefined ? { absoluteGain } : {}),
    ...(percentGain !== undefined ? { percentGain } : {}),
    cost,
    ...(absoluteGain !== undefined && cost.gold > 0 ? { gainPerGold: absoluteGain / cost.gold } : {}),
    ...(absoluteGain !== undefined && cost.stone > 0 ? { gainPerStone: absoluteGain / cost.stone } : {}),
    prerequisiteCost,
    confidence: exact ? "verified" : "partial",
    reasons,
  };
}

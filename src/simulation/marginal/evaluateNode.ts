import type { CanonicalGameData, DiceTreeNodeV3, TreeCost } from "../../game-data/types";
import { treeCostForRange, ZERO_TREE_COST } from "../../planner-v3/costs";
import { planNextRankRouteV3 } from "../../planner-v3/routes";
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
  routeNodeIds?: string[];
}

export type TreeSimulationFnV3 = (
  input: SimulationInputV3,
  data: CanonicalGameData,
) => TreeAwareSimulationResultV3;

export function prerequisiteCostForNodeV3(
  node: DiceTreeNodeV3,
  treeRanks: Record<string, number>,
  data: CanonicalGameData,
): TreeCost {
  const route = planNextRankRouteV3(data.tree, treeRanks, node.id);
  return route?.prerequisiteCost ?? { ...ZERO_TREE_COST };
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
  const route = planNextRankRouteV3(data.tree, input.treeRanks, node.id);
  const prerequisiteCost = route?.prerequisiteCost ?? { ...ZERO_TREE_COST };
  const before = simulate(input, data);
  const afterInput: SimulationInputV3 = {
    ...input,
    treeRanks: { ...input.treeRanks, ...(route?.targetRanks ?? { [nodeId]: currentRank + 1 }) },
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
    ...(route ? { routeNodeIds: route.steps.map((step) => step.nodeId) } : {}),
    confidence: exact ? "verified" : "partial",
    reasons,
  };
}

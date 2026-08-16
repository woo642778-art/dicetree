import type { CanonicalGameData, TreeCost } from "../game-data/types";
import type { SimulationInputV3 } from "../simulation/engine/types";
import { addTreeCosts } from "../planner-v3/costs";
import { evaluateNodeV3, type MarginalNodeResultV3 } from "../simulation/marginal/evaluateNode";

export interface V3TreeRecommendation extends MarginalNodeResultV3 {
  totalRouteCost: TreeCost;
}

export interface V3RecommendationSet {
  verified: V3TreeRecommendation[];
  partial: V3TreeRecommendation[];
}

export interface V3RecommendOptions {
  limit?: number;
  evaluate?: typeof evaluateNodeV3;
}

function withRouteCost(result: MarginalNodeResultV3): V3TreeRecommendation {
  return {
    ...result,
    totalRouteCost: addTreeCosts(result.cost, result.prerequisiteCost),
  };
}

function verifiedOrder(a: V3TreeRecommendation, b: V3TreeRecommendation) {
  const percent = (b.percentGain ?? -Infinity) - (a.percentGain ?? -Infinity);
  if (percent) return percent;
  const absolute = (b.absoluteGain ?? -Infinity) - (a.absoluteGain ?? -Infinity);
  if (absolute) return absolute;
  const gold = a.totalRouteCost.gold - b.totalRouteCost.gold;
  if (gold) return gold;
  const stone = a.totalRouteCost.stone - b.totalRouteCost.stone;
  return stone || a.nodeId.localeCompare(b.nodeId);
}

export function recommendTreeInvestmentsV3(
  input: SimulationInputV3,
  data: CanonicalGameData,
  options: V3RecommendOptions = {},
): V3RecommendationSet {
  const evaluate = options.evaluate ?? evaluateNodeV3;
  const evaluated = data.tree
    .filter((node) => (input.treeRanks[node.id] ?? 0) < node.maxRank)
    .map((node) => withRouteCost(evaluate(input, data, node.id)));

  const verified = evaluated
    .filter((entry) => entry.confidence === "verified" && entry.percentGain !== undefined)
    .sort(verifiedOrder)
    .slice(0, options.limit ?? 6);

  const partial = evaluated
    .filter((entry) => entry.confidence === "partial")
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  return { verified, partial };
}

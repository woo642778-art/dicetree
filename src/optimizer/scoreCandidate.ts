import type { DiceDefinition, PlannerStateV1, RecommendationScore, ResourceTotals, TreeNodeDefinition, VerificationStatus } from "../domain/types";
import { calculateRouteCost } from "../domain/costs";
import { evaluateEffect } from "../domain/effects";
import { profileWeights } from "./profileWeights";

export function normalizeResourceCost(costs: ResourceTotals) {
  return costs.gold / 1000 + costs.core * 80 + costs.token * 35;
}

export function scoreCandidate(
  node: TreeNodeDefinition,
  state: PlannerStateV1,
  dice: DiceDefinition[],
  routeCosts?: ResourceTotals,
): RecommendationScore {
  const nextRank = (state.ranks[node.id] ?? 0) + 1;
  const level = node.levels.find((x) => x.rank === nextRank);
  if (!level || !level.costsKnown || !level.effectsKnown) {
    return { score: 0, utility: 0, normalizedCost: Infinity, coverage: 0, confidence: "unverified" };
  }
  const evaluations = level.effects.map((effect) => evaluateEffect(effect, { goals: state.goals, dice }));
  const utility = evaluations.reduce((sum, item) => sum + item.utility, 0);
  const coverage = evaluations.length ? evaluations.reduce((sum, item) => sum + item.coverage, 0) / evaluations.length : 0;
  const costs = routeCosts ?? calculateRouteCost([{ nodeId: node.id, targetRank: nextRank }], state.ranks, [node]);
  const normalizedCost = normalizeResourceCost(costs);
  const weights = profileWeights[state.goals.spendingProfile];
  const focusBonus = state.goals.primaryDieId && coverage > 0 ? weights.specializationWeight : 1;
  const score = normalizedCost > 0
    ? (utility * (1 + coverage * weights.coverageWeight) * focusBonus) / Math.pow(normalizedCost, weights.costSensitivity * 0.45)
    : utility;
  const confidence: VerificationStatus = node.verification.status === "verified" && level.effects.every((e) => "verifiedFormula" in e && e.verifiedFormula)
    ? "verified"
    : node.verification.status;
  return { score, utility, normalizedCost, coverage, confidence };
}

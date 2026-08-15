import type { DiceDefinition, EvaluationMode, PlannerStateV1, Recommendation, ResourceTotals, TreeNodeDefinition } from "../domain/types";
import { calculateRouteCost, calculateSpentResources } from "../domain/costs";
import { canIncrement } from "../domain/treeRules";
import { evaluateEffect } from "../domain/effects";
import { scoreCandidate } from "./scoreCandidate";

export interface RecommendOptions {
  limit?: number;
}

function fitsBudget(spent: ResourceTotals, incremental: ResourceTotals, budget: PlannerStateV1["goals"]["budget"]) {
  if (!budget) return true;
  return (budget.gold === undefined || spent.gold + incremental.gold <= budget.gold)
    && (budget.core === undefined || spent.core + incremental.core <= budget.core)
    && (budget.token === undefined || spent.token + incremental.token <= budget.token);
}

export function recommendNextRoutes(
  state: PlannerStateV1,
  definitions: TreeNodeDefinition[],
  dice: DiceDefinition[],
  options: RecommendOptions = {},
): Recommendation[] {
  const results: Recommendation[] = [];
  const spent = calculateSpentResources(state.ranks, definitions);
  for (const node of definitions) {
    if (!canIncrement(node.id, state.ranks, definitions)) continue;
    const nextRank = (state.ranks[node.id] ?? 0) + 1;
    const level = node.levels.find((x) => x.rank === nextRank);
    if (!level || !level.costsKnown || !level.effectsKnown) continue;
    const route = [{ nodeId: node.id, targetRank: nextRank }];
    const incrementalCosts = calculateRouteCost(route, state.ranks, definitions);
    if (!fitsBudget(spent, incrementalCosts, state.goals.budget)) continue;
    const scored = scoreCandidate(node, state, dice);
    if (scored.score <= 0) continue;
    const evaluated = level.effects.map((effect) => evaluateEffect(effect, { goals: state.goals, dice }));
    const modes = evaluated.map((e) => e.mode);
    const mode: EvaluationMode = modes.every((m) => m === "exact") ? "exact" : modes.some((m) => m === "heuristic") ? "heuristic" : "unsupported";
    const exactPercent = mode === "exact" ? evaluated.reduce((sum, e) => sum + (e.exactPercent ?? 0), 0) : undefined;
    const reasons = [
      scored.coverage >= 0.99 ? "reason.coversAllFocus" : scored.coverage > 0 ? "reason.coversSomeFocus" : "reason.noCoverage",
      `reason.profile.${state.goals.spendingProfile}`,
      node.routeKnown ? "reason.routeVerified" : "reason.immediateStepOnly",
      ...new Set(evaluated.map((e) => e.reasonKey)),
    ];
    results.push({
      nodeId: node.id,
      route,
      incrementalCosts,
      score: scored.score,
      confidence: scored.confidence,
      reasons,
      mode,
      exactPercent,
    });
  }
  return results.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId)).slice(0, options.limit ?? 6);
}

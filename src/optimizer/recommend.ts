import type { DiceDefinition, EvaluationMode, PlannerStateV1, Recommendation, TreeNodeDefinition } from "../domain/types";
import { calculateRouteCost } from "../domain/costs";
import { canIncrement } from "../domain/treeRules";
import { evaluateEffect } from "../domain/effects";
import { scoreCandidate } from "./scoreCandidate";

export interface RecommendOptions {
  limit?: number;
}

export function recommendNextRoutes(
  state: PlannerStateV1,
  definitions: TreeNodeDefinition[],
  dice: DiceDefinition[],
  options: RecommendOptions = {},
): Recommendation[] {
  const results: Recommendation[] = [];
  for (const node of definitions) {
    if (!canIncrement(node.id, state.ranks, definitions)) continue;
    const nextRank = (state.ranks[node.id] ?? 0) + 1;
    const level = node.levels.find((x) => x.rank === nextRank);
    if (!level || !level.costsKnown || !level.effectsKnown) continue;
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
      route: [{ nodeId: node.id, targetRank: nextRank }],
      incrementalCosts: calculateRouteCost([{ nodeId: node.id, targetRank: nextRank }], state.ranks, definitions),
      score: scored.score,
      confidence: scored.confidence,
      reasons,
      mode,
      exactPercent,
    });
  }
  return results.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId)).slice(0, options.limit ?? 6);
}

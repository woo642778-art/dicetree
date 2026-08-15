import type { DiceDefinition, EvaluationMode, PlannerStateV1, Recommendation, ResourceTotals, RouteStep, TreeNodeDefinition } from "../domain/types";
import { calculateRouteCost, calculateSpentResources } from "../domain/costs";
import { canIncrement } from "../domain/treeRules";
import { evaluateEffect } from "../domain/effects";
import { normalizeResourceCost, scoreCandidate } from "./scoreCandidate";

export interface RecommendOptions {
  limit?: number;
}

function fitsBudget(spent: ResourceTotals, incremental: ResourceTotals, budget: PlannerStateV1["goals"]["budget"]) {
  if (!budget) return true;
  return (budget.gold === undefined || spent.gold + incremental.gold <= budget.gold)
    && (budget.core === undefined || spent.core + incremental.core <= budget.core)
    && (budget.token === undefined || spent.token + incremental.token <= budget.token);
}

function buildVerifiedRoute(
  nodeId: string,
  targetRank: number,
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): RouteStep[] | null {
  const byId = new Map(definitions.map((node) => [node.id, node]));
  const working = { ...ranks };
  const route: RouteStep[] = [];
  const routeIndex = new Map<string, number>();
  const visiting = new Set<string>();

  const recordTarget = (id: string, rank: number) => {
    const index = routeIndex.get(id);
    if (index === undefined) {
      routeIndex.set(id, route.length);
      route.push({ nodeId: id, targetRank: rank });
    } else {
      route[index] = { nodeId: id, targetRank: Math.max(route[index].targetRank, rank) };
    }
  };

  const ensureRank = (id: string, rank: number): boolean => {
    const node = byId.get(id);
    if (!node || !node.investable || node.verification.status === "unverified" || rank > node.maxRank) return false;
    if ((working[id] ?? 0) >= rank) return true;
    if (visiting.has(id)) return false;
    visiting.add(id);

    for (const prerequisite of node.prerequisites) {
      if (!ensureRank(prerequisite.nodeId, prerequisite.minRank)) {
        visiting.delete(id);
        return false;
      }
    }

    const startRank = working[id] ?? 0;
    while ((working[id] ?? 0) < rank) {
      const nextRank = (working[id] ?? 0) + 1;
      const level = node.levels.find((item) => item.rank === nextRank);
      if (!level?.costsKnown || !canIncrement(id, working, definitions)) {
        visiting.delete(id);
        return false;
      }
      working[id] = nextRank;
    }
    if (startRank < rank) recordTarget(id, rank);
    visiting.delete(id);
    return true;
  };

  return ensureRank(nodeId, targetRank) ? route : null;
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
    if (!node.investable || node.verification.status === "unverified") continue;
    const nextRank = (state.ranks[node.id] ?? 0) + 1;
    if (nextRank > node.maxRank) continue;
    const level = node.levels.find((x) => x.rank === nextRank);
    if (!level || !level.costsKnown || !level.effectsKnown) continue;

    const immediate = canIncrement(node.id, state.ranks, definitions);
    const route = immediate
      ? [{ nodeId: node.id, targetRank: nextRank }]
      : node.routeKnown
        ? buildVerifiedRoute(node.id, nextRank, state.ranks, definitions)
        : null;
    if (!route?.length) continue;

    const incrementalCosts = calculateRouteCost(route, state.ranks, definitions);
    if (!fitsBudget(spent, incrementalCosts, state.goals.budget)) continue;
    const scored = scoreCandidate(node, state, dice, incrementalCosts);
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
  return results.sort((a, b) => {
    const scoreOrder = b.score - a.score;
    if (scoreOrder) return scoreOrder;
    const costOrder = normalizeResourceCost(a.incrementalCosts) - normalizeResourceCost(b.incrementalCosts);
    return costOrder || a.nodeId.localeCompare(b.nodeId);
  }).slice(0, options.limit ?? 6);
}

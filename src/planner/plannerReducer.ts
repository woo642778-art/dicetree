import type { PlannerGoals, PlannerStateV1, RouteStep, TreeNodeDefinition } from "../domain/types";
import { applyRankTarget, canIncrement } from "../domain/treeRules";

export interface PlannerHistory {
  past: PlannerStateV1[];
  present: PlannerStateV1;
  future: PlannerStateV1[];
}

export type PlannerAction =
  | { type: "increment"; nodeId: string }
  | { type: "decrement"; nodeId: string }
  | { type: "setRank"; nodeId: string; rank: number }
  | { type: "applyRoute"; route: RouteStep[] }
  | { type: "setGoals"; goals: PlannerGoals }
  | { type: "reset"; state: PlannerStateV1 }
  | { type: "load"; state: PlannerStateV1 }
  | { type: "undo" }
  | { type: "redo" };

function commit(history: PlannerHistory, next: PlannerStateV1): PlannerHistory {
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function createPlannerHistory(initial: PlannerStateV1): PlannerHistory {
  return { past: [], present: initial, future: [] };
}

export function plannerReducer(
  history: PlannerHistory,
  action: PlannerAction,
  definitions: TreeNodeDefinition[],
): PlannerHistory {
  if (action.type === "undo") {
    if (!history.past.length) return history;
    const previous = history.past[history.past.length - 1];
    return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
  }
  if (action.type === "redo") {
    if (!history.future.length) return history;
    const next = history.future[0];
    return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
  }
  if (action.type === "load" || action.type === "reset") return commit(history, action.state);
  if (action.type === "setGoals") return commit(history, { ...history.present, goals: action.goals });

  let ranks = { ...history.present.ranks };
  if (action.type === "increment") {
    if (!canIncrement(action.nodeId, ranks, definitions)) return history;
    ranks[action.nodeId] = (ranks[action.nodeId] ?? 0) + 1;
  } else if (action.type === "decrement") {
    const current = ranks[action.nodeId] ?? 0;
    if (current <= 0) return history;
    ranks = applyRankTarget(action.nodeId, current - 1, ranks, definitions);
  } else if (action.type === "setRank") {
    const current = ranks[action.nodeId] ?? 0;
    if (action.rank > current && !canIncrement(action.nodeId, ranks, definitions)) return history;
    ranks = applyRankTarget(action.nodeId, action.rank, ranks, definitions);
  } else if (action.type === "applyRoute") {
    for (const step of action.route) {
      const node = definitions.find((n) => n.id === step.nodeId);
      if (!node) continue;
      while ((ranks[step.nodeId] ?? 0) < step.targetRank && canIncrement(step.nodeId, ranks, definitions)) {
        ranks[step.nodeId] = (ranks[step.nodeId] ?? 0) + 1;
      }
    }
  }
  return commit(history, { ...history.present, ranks });
}

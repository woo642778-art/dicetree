import type { ResourceTotals, RouteStep, TreeNodeDefinition } from "./types";

export const EMPTY_RESOURCES: ResourceTotals = { gold: 0, core: 0, token: 0 };

function add(total: ResourceTotals, costs: Partial<ResourceTotals>) {
  total.gold += costs.gold ?? 0;
  total.core += costs.core ?? 0;
  total.token += costs.token ?? 0;
}

export function calculateSpentResources(
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): ResourceTotals {
  const total = { ...EMPTY_RESOURCES };
  for (const node of definitions) {
    const rank = ranks[node.id] ?? 0;
    for (const level of node.levels) {
      if (level.rank <= rank && level.costsKnown) add(total, level.costs);
    }
  }
  return total;
}

export function calculateRouteCost(
  route: RouteStep[],
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): ResourceTotals {
  const total = { ...EMPTY_RESOURCES };
  const byId = new Map(definitions.map((node) => [node.id, node]));
  for (const step of route) {
    const node = byId.get(step.nodeId);
    if (!node) continue;
    const current = ranks[node.id] ?? 0;
    for (const level of node.levels) {
      if (level.rank > current && level.rank <= step.targetRank && level.costsKnown) add(total, level.costs);
    }
  }
  return total;
}

export function formatResources(total: ResourceTotals): string {
  const parts = [`${total.gold.toLocaleString()} G`];
  if (total.core) parts.push(`${total.core} Core`);
  if (total.token) parts.push(`${total.token} Token`);
  return parts.join(" · ");
}

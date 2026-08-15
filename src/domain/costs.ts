import type {
  ResourceCostV2,
  ResourceInventory,
  ResourceTotals,
  RouteStep,
  TreeNodeDefinition,
} from "./types";

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

export const EMPTY_RESOURCES_V2: ResourceInventory = {
  gold: 0,
  blueCard: 0,
  redCard: 0,
  prismCube: 0,
};

export function sumV2Costs(costs: ResourceCostV2[]): ResourceInventory {
  const total = { ...EMPTY_RESOURCES_V2 };
  for (const cost of costs) {
    total.gold += cost.gold ?? 0;
    total.blueCard += cost.blueCard ?? 0;
    total.redCard += cost.redCard ?? 0;
    total.prismCube += cost.prismCube ?? 0;
  }
  return total;
}

export function addV2Resources(a: ResourceInventory, b: ResourceCostV2): ResourceInventory {
  return {
    gold: a.gold + (b.gold ?? 0),
    blueCard: a.blueCard + (b.blueCard ?? 0),
    redCard: a.redCard + (b.redCard ?? 0),
    prismCube: a.prismCube + (b.prismCube ?? 0),
  };
}

export function subtractV2Resources(inventory: ResourceInventory, cost: ResourceCostV2): ResourceInventory {
  return {
    gold: inventory.gold - (cost.gold ?? 0),
    blueCard: inventory.blueCard - (cost.blueCard ?? 0),
    redCard: inventory.redCard - (cost.redCard ?? 0),
    prismCube: inventory.prismCube - (cost.prismCube ?? 0),
  };
}

export function canAffordV2(inventory: ResourceInventory, cost: ResourceCostV2): boolean {
  return (
    inventory.gold >= (cost.gold ?? 0) &&
    inventory.blueCard >= (cost.blueCard ?? 0) &&
    inventory.redCard >= (cost.redCard ?? 0) &&
    inventory.prismCube >= (cost.prismCube ?? 0)
  );
}

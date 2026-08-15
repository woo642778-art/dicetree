import type { TreeNodeDefinition } from "./types";

function mapNodes(definitions: TreeNodeDefinition[]) {
  return new Map(definitions.map((node) => [node.id, node]));
}

export function canIncrement(
  nodeId: string,
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): boolean {
  const node = mapNodes(definitions).get(nodeId);
  if (!node || !node.investable || node.verification.status === "unverified") return false;
  const current = ranks[nodeId] ?? 0;
  if (current >= node.maxRank) return false;
  return node.prerequisites.every((p) => (ranks[p.nodeId] ?? 0) >= p.minRank);
}

export function getRollbackSet(
  nodeId: string,
  targetRank: number,
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): Record<string, number> {
  const byId = mapNodes(definitions);
  const next = { ...ranks, [nodeId]: targetRank };
  const rollback: Record<string, number> = {};
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of definitions) {
      const current = next[node.id] ?? 0;
      if (current <= 0) continue;
      const invalid = node.prerequisites.some((p) => (next[p.nodeId] ?? 0) < p.minRank);
      if (invalid) {
        next[node.id] = 0;
        rollback[node.id] = 0;
        changed = true;
      }
    }
  }
  rollback[nodeId] && delete rollback[nodeId];
  if (!byId.has(nodeId)) return {};
  return rollback;
}

export function applyRankTarget(
  nodeId: string,
  targetRank: number,
  ranks: Record<string, number>,
  definitions: TreeNodeDefinition[],
): Record<string, number> {
  const node = mapNodes(definitions).get(nodeId);
  if (!node) return ranks;
  const bounded = Math.max(0, Math.min(node.maxRank, Math.floor(targetRank)));
  const next = { ...ranks, [nodeId]: bounded };
  if (bounded < (ranks[nodeId] ?? 0)) {
    Object.assign(next, getRollbackSet(nodeId, bounded, ranks, definitions));
  }
  return next;
}

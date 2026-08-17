export interface ClientDiffRecordV47 {
  diceId?: string;
  nodeId?: string;
  change?: "added" | "removed" | "changed";
  old?: unknown;
  new?: unknown;
}

export interface ClientDiffV47 {
  diceStats?: ClientDiffRecordV47[];
  treeCosts?: ClientDiffRecordV47[];
  treeTopology?: ClientDiffRecordV47[];
  passives?: ClientDiffRecordV47[];
  runes?: ClientDiffRecordV47[];
  enemies?: ClientDiffRecordV47[];
  localization?: ClientDiffRecordV47[];
  mechanicEvidence?: ClientDiffRecordV47[];
}

export interface PatchImpactSummaryV47 {
  changedDiceIds: string[];
  changedTreeNodeIds: string[];
  affectedActiveDiceIds: string[];
  counts: Record<string, number>;
  basicDpsDeltas: Array<{ diceId: string; before: number; after: number; percent: number }>;
}

const SECTIONS = ["diceStats", "treeCosts", "treeTopology", "passives", "runes", "enemies", "localization", "mechanicEvidence"] as const;

function statsDps(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const base = (value as { baseStats?: unknown }).baseStats;
  if (!base || typeof base !== "object") return undefined;
  const attack = (base as Record<string, unknown>).attack;
  const interval = (base as Record<string, unknown>).attackInterval;
  return typeof attack === "number" && typeof interval === "number" && interval > 0 ? attack / interval : undefined;
}

export function parseClientDiffV47(value: string): ClientDiffV47 {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Client diff must be a JSON object");
  for (const key of SECTIONS) {
    const section = (parsed as Record<string, unknown>)[key];
    if (section !== undefined && !Array.isArray(section)) throw new Error(`${key} must be an array`);
  }
  return parsed as ClientDiffV47;
}

export function summarizePatchImpactV47(diff: ClientDiffV47, activeDiceIds: readonly string[]): PatchImpactSummaryV47 {
  const changedDiceIds = [...new Set((diff.diceStats ?? []).map((entry) => entry.diceId).filter((id): id is string => Boolean(id)))].sort();
  const changedTreeNodeIds = [...new Set([...(diff.treeCosts ?? []), ...(diff.treeTopology ?? [])].map((entry) => entry.nodeId).filter((id): id is string => Boolean(id)))].sort();
  const active = new Set(activeDiceIds);
  const basicDpsDeltas = (diff.diceStats ?? []).flatMap((entry) => {
    if (!entry.diceId) return [];
    const before = statsDps(entry.old);
    const after = statsDps(entry.new);
    if (before === undefined || after === undefined || before === 0) return [];
    return [{ diceId: entry.diceId, before, after, percent: ((after - before) / before) * 100 }];
  });
  return {
    changedDiceIds,
    changedTreeNodeIds,
    affectedActiveDiceIds: changedDiceIds.filter((id) => active.has(id)),
    counts: Object.fromEntries(SECTIONS.map((key) => [key, diff[key]?.length ?? 0])),
    basicDpsDeltas,
  };
}

import type { PlannerStateV3 } from "../planner-v3/types";
import { simulatedInvestmentCost } from "../planner-v3/costs";
import type { SimulationInputV3 } from "../simulation/engine/types";
import { simulateDiceWithTreeV3 } from "../simulation/engine/simulateTreeAware";
import type { CanonicalGameData } from "../game-data/types";

export interface BuildSnapshotV52 {
  id: string;
  at: string;
  label: string;
  deckIds: string[];
  ownedRanks: Record<string, number>;
  simulatedRanks: Record<string, number>;
  inventory: { gold: number; stone: number };
  invested: { gold: number; stone: number };
  dps: number | null;
  confidence: "verified" | "partial";
}

export interface BuildSnapshotDeltaV52 {
  days: number;
  goldDelta: number;
  coreDelta: number;
  dpsPercent: number | null;
  addedNodeRanks: number;
}

export const BUILD_TIME_MACHINE_KEY_V52 = "dicetree:v52:build-history";

export function createBuildSnapshotV52(data: CanonicalGameData, state: PlannerStateV3, input: SimulationInputV3, deckIds: readonly string[], label: string, at = new Date().toISOString()): BuildSnapshotV52 {
  const simulation = simulateDiceWithTreeV3(input, data);
  const dps = simulation.practicalDps ?? simulation.projectedBasicAttackDps ?? simulation.basicAttackDps;
  return {
    id: `${at}:${Math.random().toString(36).slice(2, 8)}`, at, label: label.slice(0, 40), deckIds: [...deckIds].slice(0, 5),
    ownedRanks: { ...state.ownedRanks }, simulatedRanks: { ...state.simulatedRanks }, inventory: { ...state.inventory },
    invested: simulatedInvestmentCost(data.tree, state), dps,
    confidence: simulation.practicalDps === null ? "partial" : "verified",
  };
}

export function compareBuildSnapshotsV52(before: BuildSnapshotV52, after: BuildSnapshotV52): BuildSnapshotDeltaV52 {
  const ranks = (snapshot: BuildSnapshotV52) => Object.fromEntries(Object.keys({ ...snapshot.ownedRanks, ...snapshot.simulatedRanks }).map((id) => [id, Math.max(snapshot.ownedRanks[id] ?? 0, snapshot.simulatedRanks[id] ?? 0)]));
  const beforeRanks = ranks(before);
  const afterRanks = ranks(after);
  return {
    days: Math.max(0, Math.round((Date.parse(after.at) - Date.parse(before.at)) / 86_400_000)),
    goldDelta: after.invested.gold - before.invested.gold,
    coreDelta: after.invested.stone - before.invested.stone,
    dpsPercent: before.dps === null || after.dps === null || before.dps === 0 ? null : ((after.dps - before.dps) / before.dps) * 100,
    addedNodeRanks: Object.keys(afterRanks).reduce((sum, id) => sum + Math.max(0, (afterRanks[id] ?? 0) - (beforeRanks[id] ?? 0)), 0),
  };
}

export function loadBuildSnapshotsV52(storage: Pick<Storage, "getItem"> = window.localStorage): BuildSnapshotV52[] {
  try {
    const value = JSON.parse(storage.getItem(BUILD_TIME_MACHINE_KEY_V52) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((entry) => entry && typeof entry.id === "string" && typeof entry.at === "string" && Array.isArray(entry.deckIds)).slice(-40);
  } catch { return []; }
}

export function saveBuildSnapshotV52(snapshot: BuildSnapshotV52, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage) {
  const next = [...loadBuildSnapshotsV52(storage), snapshot].slice(-40);
  storage.setItem(BUILD_TIME_MACHINE_KEY_V52, JSON.stringify(next));
  return next;
}

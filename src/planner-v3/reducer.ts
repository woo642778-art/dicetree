import type {
  PlannerActionV3,
  PlannerHistoryV3,
  PlannerNodeLimitsV3,
  PlannerStateV3,
  SimulationScenarioState,
} from "./types";

function clampRank(nodeId: string, rank: number, limits: PlannerNodeLimitsV3): number | null {
  if (!limits.validNodeIds.has(nodeId) || !Number.isInteger(rank) || rank < 0) return null;
  const maximum = limits.maxRanks.get(nodeId);
  if (maximum === undefined) return null;
  return Math.min(rank, maximum);
}

function normalizeSparseRanks(
  state: PlannerStateV3,
  limits: PlannerNodeLimitsV3,
): PlannerStateV3 {
  const ownedRanks: Record<string, number> = {};
  for (const [nodeId, rawRank] of Object.entries(state.ownedRanks)) {
    const rank = clampRank(nodeId, rawRank, limits);
    if (rank !== null && rank > 0) ownedRanks[nodeId] = rank;
  }

  const simulatedRanks: Record<string, number> = {};
  for (const [nodeId, rawRank] of Object.entries(state.simulatedRanks)) {
    const rank = clampRank(nodeId, rawRank, limits);
    if (rank === null) continue;
    const owned = ownedRanks[nodeId] ?? 0;
    if (rank > owned) simulatedRanks[nodeId] = rank;
  }

  return { ...state, ownedRanks, simulatedRanks };
}

function sanitizeNonNegativeInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function sanitizePositiveFinite(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeScenario(
  scenario: SimulationScenarioState,
  fallback: SimulationScenarioState,
): SimulationScenarioState {
  const hp = scenario.enemyHpOverride;
  return {
    ...fallback,
    ...scenario,
    diceProgressionLevel: Math.max(1, sanitizeNonNegativeInteger(scenario.diceProgressionLevel, fallback.diceProgressionLevel)),
    battleUpgradeLevel: Math.max(1, sanitizeNonNegativeInteger(scenario.battleUpgradeLevel, fallback.battleUpgradeLevel)),
    durationSeconds: sanitizePositiveFinite(scenario.durationSeconds, fallback.durationSeconds),
    conditionValues: { ...scenario.conditionValues },
    ...(hp === undefined || (Number.isFinite(hp) && hp > 0) ? {} : { enemyHpOverride: fallback.enemyHpOverride }),
  };
}

function normalizeState(
  state: PlannerStateV3,
  limits: PlannerNodeLimitsV3,
  fallbackScenario: SimulationScenarioState,
): PlannerStateV3 {
  const normalized = normalizeSparseRanks(state, limits);
  return {
    ...normalized,
    schemaVersion: 3,
    inventory: {
      gold: sanitizeNonNegativeInteger(state.inventory.gold, 0),
      stone: sanitizeNonNegativeInteger(state.inventory.stone, 0),
    },
    scenario: normalizeScenario(state.scenario, fallbackScenario),
  };
}

function commit(history: PlannerHistoryV3, next: PlannerStateV3): PlannerHistoryV3 {
  if (JSON.stringify(history.present) === JSON.stringify(next)) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function createPlannerHistoryV3(initial: PlannerStateV3): PlannerHistoryV3 {
  return { past: [], present: initial, future: [] };
}

export function effectiveRankV3(state: PlannerStateV3, nodeId: string): number {
  return state.simulatedRanks[nodeId] ?? state.ownedRanks[nodeId] ?? 0;
}

export function plannerReducerV3(
  history: PlannerHistoryV3,
  action: PlannerActionV3,
  limits: PlannerNodeLimitsV3,
): PlannerHistoryV3 {
  if (action.type === "undo") {
    if (!history.past.length) return history;
    const previous = history.past[history.past.length - 1];
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future],
    };
  }

  if (action.type === "redo") {
    if (!history.future.length) return history;
    const next = history.future[0];
    return {
      past: [...history.past, history.present],
      present: next,
      future: history.future.slice(1),
    };
  }

  if (action.type === "load") {
    return commit(
      history,
      normalizeState(action.state, limits, history.present.scenario),
    );
  }

  let next = history.present;

  if (action.type === "setOwnedRank") {
    const rank = clampRank(action.nodeId, action.rank, limits);
    if (rank === null) return history;
    const ownedRanks = { ...next.ownedRanks };
    if (rank > 0) ownedRanks[action.nodeId] = rank;
    else delete ownedRanks[action.nodeId];

    const simulatedRanks = { ...next.simulatedRanks };
    const simulated = simulatedRanks[action.nodeId];
    if (simulated !== undefined && simulated <= rank) delete simulatedRanks[action.nodeId];
    next = { ...next, ownedRanks, simulatedRanks };
  } else if (action.type === "setSimulatedRank") {
    const rank = clampRank(action.nodeId, action.rank, limits);
    if (rank === null) return history;
    const owned = next.ownedRanks[action.nodeId] ?? 0;
    const simulatedRanks = { ...next.simulatedRanks };
    if (rank > owned) simulatedRanks[action.nodeId] = rank;
    else delete simulatedRanks[action.nodeId];
    next = { ...next, simulatedRanks };
  } else if (action.type === "applyRoute") {
    const simulatedRanks = { ...next.simulatedRanks };
    for (const [nodeId, rawRank] of Object.entries(action.ranks)) {
      const rank = clampRank(nodeId, rawRank, limits);
      if (rank === null) return history;
      const owned = next.ownedRanks[nodeId] ?? 0;
      if (rank > owned) simulatedRanks[nodeId] = Math.max(simulatedRanks[nodeId] ?? 0, rank);
    }
    next = { ...next, simulatedRanks };
  } else if (action.type === "clearSimulatedRanks") {
    next = { ...next, simulatedRanks: {} };
  } else if (action.type === "incrementSimulatedRank") {
    if (!limits.validNodeIds.has(action.nodeId)) return history;
    const maximum = limits.maxRanks.get(action.nodeId);
    if (maximum === undefined) return history;
    const current = effectiveRankV3(next, action.nodeId);
    if (current >= maximum) return history;
    next = {
      ...next,
      simulatedRanks: { ...next.simulatedRanks, [action.nodeId]: current + 1 },
    };
  } else if (action.type === "decrementSimulatedRank") {
    if (!limits.validNodeIds.has(action.nodeId)) return history;
    const owned = next.ownedRanks[action.nodeId] ?? 0;
    const current = effectiveRankV3(next, action.nodeId);
    if (current <= owned) return history;
    const target = current - 1;
    const simulatedRanks = { ...next.simulatedRanks };
    if (target > owned) simulatedRanks[action.nodeId] = target;
    else delete simulatedRanks[action.nodeId];
    next = { ...next, simulatedRanks };
  } else if (action.type === "setInventory") {
    next = {
      ...next,
      inventory: {
        gold: sanitizeNonNegativeInteger(action.inventory.gold ?? next.inventory.gold, next.inventory.gold),
        stone: sanitizeNonNegativeInteger(action.inventory.stone ?? next.inventory.stone, next.inventory.stone),
      },
    };
  } else if (action.type === "setScenario") {
    next = {
      ...next,
      scenario: normalizeScenario(
        { ...next.scenario, ...action.scenario },
        next.scenario,
      ),
    };
  } else if (action.type === "resetSimulation") {
    next = {
      ...next,
      simulatedRanks: {},
      scenario: {
        ...next.scenario,
        conditionValues: {},
        enemyHpOverride: undefined,
      },
    };
  }

  return commit(history, next);
}

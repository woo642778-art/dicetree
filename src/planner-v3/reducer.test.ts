import { describe, expect, it } from "vitest";
import {
  createPlannerHistoryV3,
  effectiveRankV3,
  plannerReducerV3,
} from "./reducer";
import type { PlannerNodeLimitsV3, PlannerStateV3 } from "./types";

const limits: PlannerNodeLimitsV3 = {
  validNodeIds: new Set(["5007", "5207"]),
  maxRanks: new Map([
    ["5007", 1],
    ["5207", 50],
  ]),
};

const initial = (): PlannerStateV3 => ({
  schemaVersion: 3,
  dataVersion: "rd2-1.0.1",
  ownedRanks: { "5007": 1, "5207": 5 },
  simulatedRanks: {},
  inventory: { gold: 100000, stone: 20 },
  scenario: {
    diceId: "predator",
    diceProgressionLevel: 1,
    battleUpgradeLevel: 1,
    conditionValues: {},
    enemyPresetId: "4",
    durationSeconds: 30,
  },
});

describe("plannerReducerV3", () => {
  it("stores simulated ranks as targets above the owned rank", () => {
    let history = createPlannerHistoryV3(initial());
    history = plannerReducerV3(history, { type: "incrementSimulatedRank", nodeId: "5207" }, limits);
    expect(history.present.simulatedRanks["5207"]).toBe(6);
    expect(effectiveRankV3(history.present, "5207")).toBe(6);

    history = plannerReducerV3(history, { type: "decrementSimulatedRank", nodeId: "5207" }, limits);
    expect(history.present.simulatedRanks["5207"]).toBeUndefined();
    expect(effectiveRankV3(history.present, "5207")).toBe(5);
  });

  it("never simulates below an owned rank and clamps to the real max rank", () => {
    let history = createPlannerHistoryV3(initial());
    history = plannerReducerV3(history, { type: "setSimulatedRank", nodeId: "5207", rank: 3 }, limits);
    expect(history.present.simulatedRanks["5207"]).toBeUndefined();

    history = plannerReducerV3(history, { type: "setSimulatedRank", nodeId: "5207", rank: 999 }, limits);
    expect(history.present.simulatedRanks["5207"]).toBe(50);
  });

  it("raising the owned rank removes an obsolete simulated target", () => {
    let history = createPlannerHistoryV3(initial());
    history = plannerReducerV3(history, { type: "setSimulatedRank", nodeId: "5207", rank: 8 }, limits);
    history = plannerReducerV3(history, { type: "setOwnedRank", nodeId: "5207", rank: 8 }, limits);
    expect(history.present.ownedRanks["5207"]).toBe(8);
    expect(history.present.simulatedRanks["5207"]).toBeUndefined();
  });

  it("supports undo and redo without storing presentation language", () => {
    let history = createPlannerHistoryV3(initial());
    history = plannerReducerV3(history, { type: "setInventory", inventory: { gold: 50000 } }, limits);
    expect(history.present.inventory.gold).toBe(50000);

    history = plannerReducerV3(history, { type: "undo" }, limits);
    expect(history.present.inventory.gold).toBe(100000);
    history = plannerReducerV3(history, { type: "redo" }, limits);
    expect(history.present.inventory.gold).toBe(50000);
    expect("locale" in history.present).toBe(false);
  });

  it("resetSimulation preserves owned progression and real currency inventory", () => {
    let state = initial();
    state = {
      ...state,
      simulatedRanks: { "5207": 10 },
      scenario: {
        ...state.scenario,
        conditionValues: { predatorStacks: 8 },
        enemyHpOverride: 1000000,
      },
    };
    let history = createPlannerHistoryV3(state);
    history = plannerReducerV3(history, { type: "resetSimulation" }, limits);
    expect(history.present.ownedRanks).toEqual({ "5007": 1, "5207": 5 });
    expect(history.present.simulatedRanks).toEqual({});
    expect(history.present.inventory).toEqual({ gold: 100000, stone: 20 });
    expect(history.present.scenario.conditionValues).toEqual({});
    expect(history.present.scenario.enemyHpOverride).toBeUndefined();
  });
});

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../../game-data/types";
import type { PlannerStateV3, SimulationScenarioState } from "../../../planner-v3/types";
import { SimulatorView } from "./SimulatorView";

afterEach(cleanup);

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [
    {
      id: "plain", family: "order", nameKey: "dice.plain",
      baseStats: { attack: 100, attackInterval: 2, range: 1, extra: {} },
      levelGrowth: [{ stat: "attack", operation: "add", perLevel: 10, confidence: "verified", sourceRefs: ["test"] }],
      battleUpgradeGrowth: [{ stat: "attack", operation: "add", perLevel: 20, confidence: "verified", sourceRefs: ["test"] }],
      sourceRefs: ["test"],
    },
    {
      id: "gear", family: "engineering", nameKey: "dice.gear",
      baseStats: { attack: 80, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: ["test"],
    },
  ],
  tree: [], passives: [], runes: [],
  enemies: [{ id: "normal-1", kind: "normal", nameKey: "enemy.normal", values: {}, confidence: "verified", sourceRefs: ["test"] }],
  localization: {
    ko: { "dice.plain": "기본", "dice.gear": "기어", "enemy.normal": "일반 몬스터", "sim_condition_adjacent_gear": "주변 기어 주사위 수" },
    en: { "dice.plain": "Plain", "dice.gear": "Gear", "enemy.normal": "Normal Monster", "sim_condition_adjacent_gear": "Adjacent Gear Dice" },
  },
};

const initial: PlannerStateV3 = {
  schemaVersion: 3,
  dataVersion: "test",
  ownedRanks: {},
  simulatedRanks: {},
  inventory: { gold: 10000, stone: 10 },
  scenario: {
    diceId: "plain",
    diceProgressionLevel: 1,
    battleUpgradeLevel: 1,
    conditionValues: {},
    enemyPresetId: "custom",
    enemyHpOverride: 1000,
    durationSeconds: 30,
  },
};

function Harness() {
  const [state, setState] = useState(initial);
  const change = (patch: Partial<SimulationScenarioState>) => setState((current) => ({ ...current, scenario: { ...current.scenario, ...patch } }));
  return <SimulatorView data={data} state={state} locale="ko" onScenarioChange={change} />;
}

describe("SimulatorView", () => {
  it("uses the shared engine for final stats, checkpoints and kill time", () => {
    render(<Harness />);
    expect(screen.getByTestId("v3-stat-panel")).toHaveTextContent("50");
    expect(screen.getByTestId("v3-damage-graph")).toHaveTextContent("250");
    expect(screen.getByTestId("v3-damage-graph")).toHaveTextContent("20s");

    fireEvent.change(screen.getByRole("spinbutton", { name: "영구 주사위 레벨" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "전투 파워업" }), { target: { value: "2" } });
    expect(screen.getByTestId("v3-stat-panel")).toHaveTextContent("130");
    expect(screen.getByTestId("v3-stat-panel")).toHaveTextContent("65");
  });

  it("shows only the selected dice mechanic conditions and resets them on dice change", () => {
    render(<Harness />);
    expect(screen.queryByText("주변 기어 주사위 수")).not.toBeInTheDocument();
    const list = screen.getByRole("listbox", { name: "주사위 목록" });
    fireEvent.click(within(list).getByRole("option", { name: /기어/ }));
    expect(within(screen.getByTestId("v3-condition-controls")).getByText("주변 기어 주사위 수")).toBeInTheDocument();
    expect(screen.getByTestId("v3-condition-controls")).toHaveTextContent("주변 기어 주사위 수");
  });

  it("supports canonical dice search and editable enemy inputs", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("textbox", { name: "주사위 검색" }), { target: { value: "기어" } });
    const list = screen.getByRole("listbox", { name: "주사위 목록" });
    expect(within(list).getAllByRole("option")).toHaveLength(1);
    expect(within(list).getByRole("option", { name: /기어/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "적 HP" }), { target: { value: "2000" } });
    expect(screen.getByTestId("v3-damage-graph")).toHaveTextContent("40s");
    fireEvent.change(screen.getByRole("spinbutton", { name: "적 HP" }), { target: { value: "" } });
    expect(screen.getByRole("spinbutton", { name: "적 HP" })).toHaveValue(null);
    expect(screen.getByTestId("v45-scenario-summary")).toHaveTextContent("미입력");
    fireEvent.change(screen.getByRole("spinbutton", { name: "영구 주사위 레벨" }), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "입력 초기화" }));
    expect(screen.getByRole("spinbutton", { name: "영구 주사위 레벨" })).toHaveValue(1);
  });
});

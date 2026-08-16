import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CanonicalGameData, DiceTreeNodeV3 } from "../../../game-data/types";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import { NodeDetailSheet } from "./NodeDetailSheet";
import { planNextRankRouteV3 } from "../../../planner-v3/routes";

afterEach(cleanup);

const root: DiceTreeNodeV3 = {
  id: "root", family: "core", kind: "passive", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 2,
  costsByRank: [{ gold: 100, stone: 0 }, { gold: 200, stone: 1 }], passiveOrRuneRef: "passive:AttackUp",
  nameKey: "node.root", descriptionKey: "node.root.desc", sourceRefs: [],
};
const child: DiceTreeNodeV3 = {
  id: "child", family: "chaos", kind: "passive", position: { x: 1, y: 1 }, prerequisites: [{ nodeId: "root", minRank: 2 }], maxRank: 1,
  costsByRank: [{ gold: 3000, stone: 2 }], nameKey: "node.child", descriptionKey: "node.child.desc", sourceRefs: [],
};

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [], tree: [root, child], runes: [], enemies: [],
  passives: [{
    id: "AttackUp", scope: "global", maxRank: 2, baseValue: 5, valuePerRank: 1.2, valueType: "%",
    confidence: "verified", sourceRefs: ["passive-source"],
  }],
  localization: {
    ko: { "node.root": "모든 주사위 대미지", "node.root.desc": "<tag>BULLET</tag> 대미지 {0}% <color=#00FF00>(+{1}%)</color> 증가", "node.child": "포식 강화", "node.child.desc": "포식 강화 효과", "valuetype_percent": "%" },
    en: { "node.root": "All Dice Damage", "node.root.desc": "Increases all dice attack damage.", "node.child": "Predator Boost", "node.child.desc": "Predator boost effect" },
  },
};

function state(overrides: Partial<PlannerStateV3> = {}): PlannerStateV3 {
  return {
    schemaVersion: 3, dataVersion: "test", ownedRanks: { root: 1 }, simulatedRanks: {}, inventory: { gold: 10000, stone: 5 },
    scenario: { diceId: "predator", diceProgressionLevel: 1, battleUpgradeLevel: 1, conditionValues: {}, enemyPresetId: "custom", durationSeconds: 30 },
    ...overrides,
  };
}

describe("NodeDetailSheet", () => {
  it("shows canonical name, effect, delta, Gold and Dice Core next cost", () => {
    render(<NodeDetailSheet node={root} data={data} state={state()} locale="ko" selectedDiceId="predator" onSetSimulatedRank={() => {}} />);
    expect(screen.getByRole("heading", { name: "모든 주사위 대미지" })).toBeInTheDocument();
    expect(screen.getByText("5 %")).toBeInTheDocument();
    expect(screen.getByText("6.2 %")).toBeInTheDocument();
    expect(screen.getByText("+1.2")).toBeInTheDocument();
    expect(screen.getByText("불렛 대미지 5% (+1.2%) 증가")).toBeInTheDocument();
    expect(screen.queryByText(/valuetype_percent|<tag>|\{0\}/)).not.toBeInTheDocument();
    expect(screen.getByTestId("v3-next-cost")).toHaveTextContent("200 골드 · 1 다이스 코어");
    expect(screen.queryByText(/상세 확인 중/)).not.toBeInTheDocument();
  });

  it("keeps owned rank immutable while simulated controls move only above it", () => {
    const onSet = vi.fn();
    const { rerender } = render(<NodeDetailSheet node={root} data={data} state={state()} locale="ko" onSetSimulatedRank={onSet} />);
    const decrease = screen.getByRole("button", { name: "가상 랭크 내리기" });
    const increase = screen.getByRole("button", { name: "가상 랭크 올리기" });
    expect(decrease).toBeDisabled();
    fireEvent.click(increase);
    expect(onSet).toHaveBeenCalledWith("root", 2);

    rerender(<NodeDetailSheet node={root} data={data} state={state({ simulatedRanks: { root: 2 } })} locale="ko" onSetSimulatedRank={onSet} />);
    expect(screen.getByRole("button", { name: "가상 랭크 올리기" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "가상 랭크 내리기" }));
    expect(onSet).toHaveBeenLastCalledWith("root", 1);
  });

  it("disables an increment when prerequisite ranks are not satisfied", () => {
    render(<NodeDetailSheet node={child} data={data} state={state()} locale="ko" onSetSimulatedRank={() => {}} />);
    expect(screen.getByRole("button", { name: "가상 랭크 올리기" })).toBeDisabled();
    expect(screen.getByText("모든 주사위 대미지")).toBeInTheDocument();
    expect(screen.getByText("Lv.2")).toBeInTheDocument();
  });

  it("shows exact selected-dice impact only when the shared marginal result is verified", () => {
    const { rerender } = render(<NodeDetailSheet
      node={root} data={data} state={state()} locale="ko" selectedDiceId="predator"
      marginal={{ nodeId: "root", beforeDps: 100, afterDps: 110, absoluteGain: 10, percentGain: 10, cost: { gold: 200, stone: 1 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "verified", reasons: [] }}
      onSetSimulatedRank={() => {}}
    />);
    expect(screen.getByTestId("v3-node-impact")).toHaveTextContent("100 → 110 DPS +10.00%");

    rerender(<NodeDetailSheet
      node={root} data={data} state={state()} locale="ko" selectedDiceId="predator"
      marginal={{ nodeId: "root", cost: { gold: 200, stone: 1 }, prerequisiteCost: { gold: 0, stone: 0 }, confidence: "partial", reasons: ["needs-mechanic-verification"] }}
      onSetSimulatedRank={() => {}}
    />);
    expect(screen.getByTestId("v3-node-impact")).toHaveTextContent("부분 검증");
  });

  it("shows and applies the complete prerequisite purchase route", () => {
    const applyRoute = vi.fn();
    const route = planNextRankRouteV3(data.tree, { root: 1 }, "child");
    render(<NodeDetailSheet
      node={child} data={data} state={state()} locale="ko" route={route} routeAffordable={false}
      onApplyRoute={applyRoute} onSetSimulatedRank={() => {}}
    />);
    expect(screen.getByTestId("v4-route-plan")).toHaveTextContent("모든 주사위 대미지Lv.1 → 2");
    expect(screen.getByTestId("v4-route-plan")).toHaveTextContent("포식 강화Lv.0 → 1");
    expect(screen.getByTestId("v4-route-plan")).toHaveTextContent("3,200 골드 · 3 다이스 코어");
    expect(screen.getByTestId("v4-route-plan")).toHaveTextContent("현재 재화가 부족");
    fireEvent.click(screen.getByRole("button", { name: "경로 가상 적용" }));
    expect(applyRoute).toHaveBeenCalledWith({ root: 2, child: 1 });
  });
});

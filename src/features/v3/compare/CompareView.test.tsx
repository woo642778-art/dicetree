import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { CompareView } from "./CompareView";

afterEach(cleanup);

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "2026-08-16T00:00:00Z" },
  dice: [
    { id: "a", nameKey: "dice.a", baseStats: { attack: 100, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] },
    { id: "b", nameKey: "dice.b", baseStats: { attack: 120, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] },
    { id: "partial", nameKey: "dice.partial", mechanicRuleId: "Unknown", baseStats: { attack: 200, attackInterval: 1, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] },
  ], tree: [{ id: "unknown-tree", family: "core", kind: "perk", position: { x: 0, y: 0 }, prerequisites: [], maxRank: 1, costsByRank: [{ gold: 1, stone: 0 }], passiveOrRuneRef: "rune:unknown", sourceRefs: [] }], passives: [], runes: [{ id: "unknown", kind: "unknown", values: {}, confidence: "verified", sourceRefs: [] }], enemies: [],
  localization: { ko: { "dice.a": "A 주사위", "dice.b": "B 주사위", "dice.partial": "부분 주사위" }, en: {} },
};

function input(diceId: string): SimulationInputV3 {
  return { diceId, diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {}, enemy: { id: "custom", kind: "custom", hp: 1000 }, durationSeconds: 30 };
}

describe("CompareView", () => {
  it("compares exact configurations with the shared scenario runner", () => {
    render(<CompareView data={data} locale="ko" left={input("a")} right={input("b")} />);
    expect(screen.getByTestId("compare-left")).toHaveTextContent("50");
    expect(screen.getByTestId("compare-right")).toHaveTextContent("60");
    expect(screen.getByTestId("compare-delta")).toHaveTextContent("+10");
    expect(screen.getByTestId("compare-delta")).toHaveTextContent("+20.00%");
    expect(screen.getByTestId("compare-right")).toHaveClass("is-winner");
  });

  it("compares the shared basic-attack scope when a special mechanic is partial", () => {
    render(<CompareView data={data} locale="ko" left={input("a")} right={input("partial")} />);
    expect(screen.getByTestId("compare-delta")).toHaveTextContent("추정 비교");
    expect(screen.getByTestId("compare-delta")).toHaveTextContent("+150");
    expect(screen.getByTestId("compare-right")).toHaveClass("is-winner");
  });

  it("removes tree effects from both sides when either tree path is unresolved", () => {
    render(<CompareView data={data} locale="ko" left={{ ...input("a"), treeRanks: { "unknown-tree": 1 } }} right={input("b")} />);
    expect(screen.getByTestId("compare-left")).toHaveTextContent("트리·특수효과 제외 예상 DPS");
    expect(screen.getByTestId("compare-right")).toHaveTextContent("트리·특수효과 제외 예상 DPS");
    expect(screen.getByTestId("compare-delta")).toHaveTextContent("추정 비교");
  });
});

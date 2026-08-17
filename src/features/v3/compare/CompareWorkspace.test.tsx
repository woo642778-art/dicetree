import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CanonicalGameData } from "../../../game-data/types";
import type { SimulationInputV3 } from "../../../simulation/engine/types";
import { CompareWorkspace } from "./CompareWorkspace";

afterEach(cleanup);

const data: CanonicalGameData = {
  manifest: { schemaVersion: 3, clientVersion: "test", sourceSha256: "x", extractorVersion: "test", extractedAt: "now" },
  dice: [
    { id: "a", nameKey: "a", baseStats: { attack: 100, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] },
    { id: "b", nameKey: "b", baseStats: { attack: 200, attackInterval: 2, extra: {} }, levelGrowth: [], battleUpgradeGrowth: [], sourceRefs: [] },
  ],
  tree: [], passives: [], runes: [], enemies: [], localization: { ko: { a: "A 주사위", b: "B 주사위" }, en: { a: "Dice A", b: "Dice B" } },
};

const baseInput: SimulationInputV3 = { diceId: "a", diceProgressionLevel: 1, battleUpgradeLevel: 1, treeRanks: {}, conditionValues: {}, enemy: { id: "custom", kind: "custom", hp: 1000 }, durationSeconds: 30 };

describe("CompareWorkspace", () => {
  it("edits A and B independently and can swap them", () => {
    render(<CompareWorkspace data={data} locale="ko" baseInput={baseInput} />);
    fireEvent.change(screen.getByLabelText("B 주사위"), { target: { value: "b" } });
    fireEvent.change(screen.getByLabelText("B 영구 레벨"), { target: { value: "4" } });
    expect(screen.getByLabelText("A 주사위")).toHaveValue("a");
    expect(screen.getByLabelText("B 주사위")).toHaveValue("b");
    expect(screen.getByTestId("compare-left-dps")).toHaveTextContent("50");
    expect(screen.getByTestId("compare-right-dps")).toHaveTextContent("100");

    fireEvent.click(screen.getByRole("button", { name: "A/B 바꾸기" }));
    expect(screen.getByLabelText("A 주사위")).toHaveValue("b");
    expect(screen.getByLabelText("B 주사위")).toHaveValue("a");
  });
});

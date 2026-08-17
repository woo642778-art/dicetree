import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameDataV3 } from "../../../game-data/load";
import type { PlannerStateV3 } from "../../../planner-v3/types";
import { AccountImportPanelV49 } from "./AccountImportPanelV49";

afterEach(cleanup);

const state: PlannerStateV3 = {
  schemaVersion: 3, dataVersion: "test", ownedRanks: {}, simulatedRanks: {}, inventory: { gold: 10, stone: 2 },
  scenario: { diceId: "wind", diceProgressionLevel: 1, battleUpgradeLevel: 1, conditionValues: {}, durationSeconds: 30, enemyPresetId: "custom" },
};

describe("AccountImportPanelV49", () => {
  it("applies only an observed ranking deck for a known nickname", () => {
    const onObservedImport = vi.fn();
    render(<AccountImportPanelV49 data={gameDataV3} locale="ko" state={state} onObservedImport={onObservedImport} onFullImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("닉네임 또는 PID"), { target: { value: "Asmo" } });
    fireEvent.click(screen.getByRole("button", { name: "찾기" }));
    expect(screen.getByTestId("v49-account-import")).toHaveTextContent("#1230 · Asmo");
    fireEvent.click(screen.getByRole("button", { name: "관측 덱만 적용" }));
    expect(onObservedImport).toHaveBeenCalledWith(expect.objectContaining({ nickname: "Asmo", completeness: "rank-and-deck-only" }));
  });

  it("rejects malformed full snapshots instead of inventing an account", () => {
    render(<AccountImportPanelV49 data={gameDataV3} locale="ko" state={state} onObservedImport={vi.fn()} onFullImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("계정 스냅샷 JSON"), { target: { value: "{bad" } });
    fireEvent.click(screen.getByRole("button", { name: "검증 후 전체 적용" }));
    expect(screen.getByRole("status")).toHaveTextContent("JSON 형식을 읽을 수 없습니다");
  });
});

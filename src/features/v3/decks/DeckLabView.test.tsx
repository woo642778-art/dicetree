import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameDataV3 } from "../../../game-data/load";
import { DeckLabView } from "./DeckLabView";

afterEach(cleanup);

describe("DeckLabView", () => {
  it("separates observed ranking data from forecasts and renders five personal slots", () => {
    render(<DeckLabView data={gameDataV3} locale="ko" goal="balanced" spendProfile="free" onGoalChange={vi.fn()} onSpendProfileChange={vi.fn()} onSimulate={vi.fn()} />);
    expect(screen.getByTestId("v4-meta-status")).toHaveTextContent("2026.08.16 협동 랭킹 스냅샷");
    expect(screen.getByTestId("v43-ranking-snapshot")).toHaveTextContent("105개 랭킹 덱");
    expect(screen.getByTestId("v43-dealer-lane")).toHaveTextContent("딜러 덱");
    expect(screen.getByTestId("v43-support-lane")).toHaveTextContent("서포트 덱");
    expect(screen.getByTestId("v43-forecast")).toHaveTextContent("예측 · 랭킹 사실 아님");
    expect(screen.getByTestId("v43-forecast")).toHaveTextContent("55종 전수 분석");
    for (let index = 1; index <= 5; index += 1) {
      const slot = screen.getByTestId(`deck-slot-${index}`);
      expect(slot).toBeInTheDocument();
      expect(slot.querySelector("img[data-dice-id]")).toBeInTheDocument();
    }
    expect(screen.queryByText(/<tag>|\{0\}/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/IPA/i);
  });

  it("changes profiles and opens the selected primary dealer in the simulator", () => {
    const onGoalChange = vi.fn();
    const onSpendProfileChange = vi.fn();
    const onSimulate = vi.fn();
    render(<DeckLabView data={gameDataV3} locale="ko" goal="balanced" spendProfile="free" onGoalChange={onGoalChange} onSpendProfileChange={onSpendProfileChange} onSimulate={onSimulate} />);
    fireEvent.change(screen.getByLabelText("플레이 역할"), { target: { value: "support" } });
    fireEvent.change(screen.getByLabelText("투자 성향"), { target: { value: "invested" } });
    fireEvent.click(screen.getByRole("button", { name: "주 딜러 시뮬레이션" }));
    expect(onGoalChange).toHaveBeenCalledWith("support");
    expect(onSpendProfileChange).toHaveBeenCalledWith("invested");
    expect(onSimulate).toHaveBeenCalledTimes(1);
  });
});

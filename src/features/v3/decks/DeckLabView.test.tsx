import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameDataV3 } from "../../../game-data/load";
import { DeckLabView } from "./DeckLabView";

afterEach(cleanup);

describe("DeckLabView", () => {
  it("separates client synergy from unverified live meta and renders five slots", () => {
    render(<DeckLabView data={gameDataV3} locale="ko" goal="balanced" spendProfile="free" onGoalChange={vi.fn()} onSpendProfileChange={vi.fn()} onSimulate={vi.fn()} />);
    expect(screen.getByTestId("v4-meta-status")).toHaveTextContent("라이브 메타 미검증");
    expect(screen.getByTestId("v4-meta-status")).toHaveTextContent("랭킹·사용률 데이터가 없습니다");
    for (let index = 1; index <= 5; index += 1) expect(screen.getByTestId(`deck-slot-${index}`)).toBeInTheDocument();
    expect(screen.queryByText(/<tag>|\{0\}/)).not.toBeInTheDocument();
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

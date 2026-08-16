import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildDamageOutcomeV3, deterministicDpsRange } from "../../../simulation/probability/outcomes";
import { DamageGraph } from "./DamageGraph";

afterEach(cleanup);

describe("DamageGraph", () => {
  it("shows a clearly labelled basic-attack baseline when practical DPS is unresolved", () => {
    const baseline = buildDamageOutcomeV3(deterministicDpsRange(100), 1000);
    render(<DamageGraph outcome={null} basicAttackOutcome={baseline} basicAttackOutcomeKind="verified" locale="ko" />);
    expect(screen.getByTestId("v3-damage-graph")).toHaveAttribute("data-outcome-kind", "verified");
    expect(screen.getByText("특수효과 제외 기본 공격 피해")).toBeInTheDocument();
    expect(screen.getByText(/미복원 특수효과는 포함하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByTestId("damage-5s")).toHaveTextContent("500");
    expect(screen.getByTestId("damage-kill-time")).toHaveTextContent("10s");
  });
});

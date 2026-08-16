import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { App } from "./App";

function renderApp() {
  return render(<I18nProvider><App /></I18nProvider>);
}

describe("IPA-driven planner", () => {
  it("renders the exact 239-node tree with real Predator details", () => {
    renderApp();
    expect(screen.getByTestId("tree-canvas")).toBeInTheDocument();
    expect(screen.getByText("239 노드")).toBeInTheDocument();
    expect(screen.getAllByText("포식 주사위").length).toBeGreaterThan(0);
    expect(screen.getByTestId("node-panel")).toHaveTextContent("범위 내 몬스터 처치 시 PREDATOR 획득");
  });

  it("uses the exact rank ladder for Chaos attack speed and feeds it into the simulator", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("node-5103"));
    expect(screen.getByTestId("node-panel")).toHaveTextContent("혼돈 주사위 공격속도");
    expect(screen.getByTestId("node-panel")).toHaveTextContent("5%");
    fireEvent.click(screen.getByRole("button", { name: "rank up" }));
    expect(screen.getByText("트리 공격속도").parentElement).toHaveTextContent("+5%");
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("−3,000");
  });
});

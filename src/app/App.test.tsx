import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { App } from "./App";

afterEach(() => cleanup());

describe("V2 planner shell", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/dicetree/");
  });

  it("renders the white V2 tree and four-resource rail", () => {
    const { container } = render(<I18nProvider><App /></I18nProvider>);
    expect(screen.getByText("랜덤다이스2 트리")).toBeInTheDocument();
    expect(screen.getByTestId("tree-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("골드");
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("파란 재화");
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("빨간 재화");
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("프리즘 재화");
    expect(container.querySelector(".workspace")).toBeNull();
    expect(container.querySelector(".v2-workspace")).not.toBeNull();
  });

  it("shows a photographed next-step cost without extrapolating the full ladder", () => {
    render(<I18nProvider><App /></I18nProvider>);
    fireEvent.click(screen.getByTestId("node-global-bullet-observed-next"));
    expect(screen.getByTestId("node-panel")).toHaveTextContent("3,000 골드");
    expect(screen.getByTestId("node-panel")).toHaveTextContent("50/100레벨 전체 비용으로 반복 추정하지 않습니다");
    fireEvent.click(screen.getByRole("button", { name: "다음 1단계 계획에 추가" }));
    expect(screen.getByTestId("resource-summary")).toHaveTextContent("−3,000");
  });
});

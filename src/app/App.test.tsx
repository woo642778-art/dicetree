import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { App } from "./App";

afterEach(cleanup);

describe("V3 planner shell", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/dicetree/");
  });

  it("defaults to the IPA-backed Dice Tree with Gold and Dice Core only", () => {
    const { container } = render(<I18nProvider><App /></I18nProvider>);
    expect(screen.getByTestId("v3-app")).toBeInTheDocument();
    expect(screen.getByTestId("v3-tree-view")).toBeInTheDocument();
    expect(screen.getByTestId("v3-tree-canvas")).toBeInTheDocument();
    const resources = screen.getByLabelText("다이스 트리 재화");
    expect(resources).toHaveTextContent("골드");
    expect(resources).toHaveTextContent("다이스 코어");
    expect(container).not.toHaveTextContent("파란 재화");
    expect(container).not.toHaveTextContent("빨간 재화");
    expect(container).not.toHaveTextContent("프리즘 재화");
    expect(container.querySelector(".v2-app")).toBeNull();
  });

  it("switches Tree, Simulator and Compare as first-class views", () => {
    render(<I18nProvider><App /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "시뮬레이터" }));
    expect(screen.getByTestId("v3-simulator-view")).toBeInTheDocument();
    expect(screen.queryByTestId("v3-tree-view")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "비교" }));
    expect(screen.getByTestId("v3-compare-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다이스 트리" }));
    expect(screen.getByTestId("v3-tree-view")).toBeInTheDocument();
  });

  it("keeps V3 share state semantic and restorable", async () => {
    const clipboard = { writeText: async () => undefined };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
    render(<I18nProvider><App /></I18nProvider>);
    fireEvent.change(screen.getByRole("spinbutton", { name: "보유 골드" }), { target: { value: "12345" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "보유 다이스 코어" }), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "공유" }));
    expect(window.location.hash).toMatch(/^#b=v3\./);
  });
});

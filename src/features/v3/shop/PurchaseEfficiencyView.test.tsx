import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PurchaseEfficiencyView } from "./PurchaseEfficiencyView";

afterEach(cleanup);

describe("PurchaseEfficiencyView currency locale", () => {
  it("renders won only for Korean", () => {
    const { container } = render(<PurchaseEfficiencyView locale="ko" />);
    const prices = [...container.querySelectorAll(".v41-price strong")].map((element) => element.textContent ?? "");
    expect(prices.length).toBeGreaterThan(0);
    expect(prices.every((price) => price.startsWith("₩"))).toBe(true);
    expect(prices.some((price) => price.includes("$"))).toBe(false);
  });

  it("renders dollars only for English", () => {
    const { container } = render(<PurchaseEfficiencyView locale="en" />);
    const prices = [...container.querySelectorAll(".v41-price strong")].map((element) => element.textContent ?? "");
    expect(prices.length).toBeGreaterThan(0);
    expect(prices.every((price) => price.startsWith("$"))).toBe(true);
    expect(prices.some((price) => price.includes("₩"))).toBe(false);
  });

  it("lists current popup products and only optimizes price-only entries after rewards are entered", () => {
    render(<PurchaseEfficiencyView locale="ko" />);
    expect(screen.getByTestId("v50-popup-VIP_HOTDEAL")).toHaveTextContent("₩29,000");
    expect(screen.getByTestId("v50-popup-TRG_NINJA_TOUCH_2")).toHaveTextContent("₩33,000");
    expect(screen.getByTestId("v50-popup-TRG_SHADOW_GOLD")).toHaveTextContent("₩33,000");
    const before = screen.getByTestId("v47-budget-optimizer").textContent;
    fireEvent.change(screen.getByLabelText("VIP_HOTDEAL core"), { target: { value: "100" } });
    expect(screen.getByTestId("v47-budget-optimizer").textContent).not.toBe(before);
    expect(screen.getByTestId("v47-budget-optimizer")).toHaveTextContent("VIP 핫딜");
    expect(screen.getByLabelText("VIP_HOTDEAL core")).toHaveValue(100);
  });

  it("combines farming time and cash while requiring both resource targets", () => {
    render(<PurchaseEfficiencyView locale="ko" />);
    fireEvent.change(screen.getByLabelText("현재 골드"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("목표 골드"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("현재 다이스 코어"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("목표 다이스 코어"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("하루 획득 골드"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("하루 획득 코어"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("투자 가능 일수"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("최대 현금 예산"), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText("최적화 기준"), { target: { value: "min-spend" } });

    const planner = screen.getByTestId("v51-time-cash-planner");
    expect(planner).toHaveTextContent("₩0 + 10일");
    expect(planner).toHaveTextContent("결제하지 않고 파밍으로 진행");

    fireEvent.change(screen.getByLabelText("투자 가능 일수"), { target: { value: "5" } });
    expect(planner).toHaveTextContent("₩3,300 + 2일");
    expect(planner).toHaveTextContent("첫 구매 패키지");
  });

  it("shows exact Gold and Core shortfalls when neither play nor budget can finish the goal", () => {
    render(<PurchaseEfficiencyView locale="ko" />);
    fireEvent.change(screen.getByLabelText("현재 골드"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("목표 골드"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("현재 다이스 코어"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("목표 다이스 코어"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("하루 획득 골드"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("하루 획득 코어"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("최대 현금 예산"), { target: { value: "0" } });

    expect(screen.getByTestId("v51-time-cash-planner")).toHaveTextContent("골드 1,000 · 코어 10 추가 필요");
  });
});

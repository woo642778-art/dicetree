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
});

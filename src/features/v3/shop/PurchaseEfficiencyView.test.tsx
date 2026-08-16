import { cleanup, render } from "@testing-library/react";
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
});

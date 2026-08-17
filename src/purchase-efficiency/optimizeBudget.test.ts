import { describe, expect, it } from "vitest";
import { optimizePurchaseBudgetV47 } from "./optimizeBudget";
import { PURCHASE_PRODUCTS_V41 } from "./products";

describe("budget-constrained purchase optimization", () => {
  it("evaluates every one-copy package combination within a Korean budget", () => {
    const result = optimizePurchaseBudgetV47({ locale: "ko", budget: 30_000, goal: "core", currentCore: 420, targetCore: 480 });
    expect(result.spent).toBeLessThanOrEqual(30_000);
    expect(result.evaluatedCombinations).toBeGreaterThan(1);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.rewards.core).toBe(PURCHASE_PRODUCTS_V41.filter((product) => result.products.some((choice) => choice.id === product.id)).reduce((sum, product) => sum + (product.rewards.core ?? 0), 0));
  });

  it("minimizes core waste once the target is reachable", () => {
    const result = optimizePurchaseBudgetV47({ locale: "en", budget: 100, goal: "core", currentCore: 0, targetCore: 8 });
    expect(result.reachesTarget).toBe(true);
    expect(result.coreWaste).toBe(0);
  });

  it("returns a truthful shortfall when the budget cannot reach the target", () => {
    const result = optimizePurchaseBudgetV47({ locale: "ko", budget: 3_000, goal: "core", currentCore: 0, targetCore: 100 });
    expect(result.reachesTarget).toBe(false);
    expect(result.coreShortfall).toBeGreaterThan(0);
  });
});

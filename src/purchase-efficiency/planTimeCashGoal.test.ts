import { describe, expect, it } from "vitest";
import type { PurchaseProduct } from "./products";
import { planTimeCashGoalV51 } from "./planTimeCashGoal";

const products: PurchaseProduct[] = [
  {
    id: "HALF",
    nameKo: "절반 패키지",
    priceUsd: 1.99,
    officialKrw: 3_000,
    rewards: { gold: 500, core: 5 },
    category: "special",
    sourceTables: ["test"],
  },
  {
    id: "FULL",
    nameKo: "완성 패키지",
    priceUsd: 5.99,
    officialKrw: 9_000,
    rewards: { gold: 1_000, core: 10 },
    category: "special",
    sourceTables: ["test"],
  },
];

const base = {
  locale: "ko" as const,
  budget: 10_000,
  currentGold: 0,
  targetGold: 1_000,
  currentCore: 0,
  targetCore: 10,
  dailyGold: 100,
  dailyCore: 1,
  maxDays: 10,
};

describe("time plus cash resource goal planning", () => {
  it("returns a zero-cost farming plan when minimum spend is preferred and the deadline is reachable", () => {
    const result = planTimeCashGoalV51({ ...base, preference: "min-spend" }, products);
    expect(result.reachesTarget).toBe(true);
    expect(result.spent).toBe(0);
    expect(result.farmingDays).toBe(10);
    expect(result.products).toHaveLength(0);
    expect(result.final).toEqual({ gold: 1_000, core: 10 });
  });

  it("buys the cheapest bridge package needed to meet a shorter deadline", () => {
    const result = planTimeCashGoalV51({ ...base, maxDays: 5, preference: "min-spend" }, products);
    expect(result.reachesTarget).toBe(true);
    expect(result.products.map((product) => product.id)).toEqual(["HALF"]);
    expect(result.spent).toBe(3_000);
    expect(result.farmingDays).toBe(5);
  });

  it("uses the full package when fastest completion is selected", () => {
    const result = planTimeCashGoalV51({ ...base, preference: "fastest" }, products);
    expect(result.reachesTarget).toBe(true);
    expect(result.products.map((product) => product.id)).toEqual(["FULL"]);
    expect(result.farmingDays).toBe(0);
    expect(result.timeSavedDays).toBe(10);
  });

  it("requires both resources instead of treating either target as sufficient", () => {
    const goldOnly = [{ ...products[1], id: "GOLD_ONLY", rewards: { gold: 5_000 } }];
    const result = planTimeCashGoalV51({ ...base, dailyCore: 0, preference: "fastest" }, goldOnly);
    expect(result.reachesTarget).toBe(false);
    expect(result.shortfall).toEqual({ gold: 0, core: 10 });
    expect(result.farmingDays).toBeNull();
  });

  it("returns the closest exact deadline projection when the goal is impossible", () => {
    const result = planTimeCashGoalV51({ ...base, budget: 0, dailyGold: 40, dailyCore: 0, maxDays: 5, preference: "balanced" }, products);
    expect(result.reachesTarget).toBe(false);
    expect(result.spent).toBe(0);
    expect(result.projectedDays).toBe(5);
    expect(result.final).toEqual({ gold: 200, core: 0 });
    expect(result.shortfall).toEqual({ gold: 800, core: 10 });
  });

  it("keeps decimal USD budgets instead of rounding them below a package price", () => {
    const usdProduct: PurchaseProduct = { ...products[0], priceUsd: 1.99, officialKrw: undefined };
    const result = planTimeCashGoalV51({ ...base, locale: "en", budget: 1.99, maxDays: 5, preference: "min-spend" }, [usdProduct]);
    expect(result.reachesTarget).toBe(true);
    expect(result.spent).toBe(1.99);
    expect(result.products).toHaveLength(1);
  });
});

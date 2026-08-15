import { describe, expect, it } from "vitest";
import { calculateSpentResources, canAffordV2, sumV2Costs } from "./costs";
import { sampleTree } from "../test/fixtures";

describe("calculateSpentResources", () => {
  it("sums only purchased known levels", () => {
    expect(calculateSpentResources({ "test-node": 1 }, sampleTree)).toEqual({ gold: 100, core: 0, token: 0 });
  });
});

describe("V2 four-resource costs", () => {
  it("sums all observed resource types independently", () => {
    expect(sumV2Costs([
      { gold: 2000, blueCard: 1 },
      { gold: 50000, prismCube: 10 },
      { redCard: 3 },
    ])).toEqual({ gold: 52000, blueCard: 1, redCard: 3, prismCube: 10 });
  });

  it("checks affordability without converting one resource into another", () => {
    expect(canAffordV2(
      { gold: 100000, blueCard: 81, redCard: 6, prismCube: 22 },
      { gold: 50000, prismCube: 10 },
    )).toBe(true);
    expect(canAffordV2(
      { gold: 100000, blueCard: 81, redCard: 6, prismCube: 2 },
      { gold: 50000, prismCube: 10 },
    )).toBe(false);
  });
});

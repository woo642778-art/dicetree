import { describe, expect, it } from "vitest";
import { binomialOutcomeRange, binomialPmf, binomialQuantile } from "./binomial";

describe("binomial practical outcome range", () => {
  it("normalizes a small exact distribution", () => {
    const pmf = binomialPmf(4, 0.5);
    expect(pmf.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(pmf).toEqual([
      0.0625,
      0.25,
      0.375,
      0.25,
      0.0625,
    ]);
  });

  it("uses actual 10th and 90th percentile counts instead of arbitrary +/- percentages", () => {
    expect(binomialOutcomeRange(10, 0.3)).toEqual({
      lowCount: 1,
      expectedCount: 3,
      highCount: 5,
    });
  });

  it("handles deterministic probabilities exactly", () => {
    expect(binomialQuantile(20, 0, 0.9)).toBe(0);
    expect(binomialQuantile(20, 1, 0.1)).toBe(20);
  });
});

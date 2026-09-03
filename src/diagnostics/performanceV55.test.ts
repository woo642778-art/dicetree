import { describe, expect, it } from "vitest";
import { ratePerformanceMetricV55 } from "./performanceV55";

describe("local performance diagnostics V55", () => {
  it("uses Core Web Vitals-compatible thresholds", () => {
    expect(ratePerformanceMetricV55("lcp", 2400)).toBe("good");
    expect(ratePerformanceMetricV55("lcp", 3000)).toBe("needs-improvement");
    expect(ratePerformanceMetricV55("inp", 800)).toBe("poor");
    expect(ratePerformanceMetricV55("cls", undefined)).toBe("unavailable");
  });
});

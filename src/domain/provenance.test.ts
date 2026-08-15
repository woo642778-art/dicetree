import { describe, expect, it } from "vitest";
import { canUseExactValue, validateSourcedField } from "./provenance";

describe("V2 provenance", () => {
  it("rejects exact values labelled unknown", () => {
    expect(validateSourcedField({ value: 3000, confidence: "unknown", sourceIds: [] }, "cost")).toContain(
      "cost: unknown fields cannot carry an exact value",
    );
  });

  it("requires sources for observed exact values", () => {
    expect(validateSourcedField({ value: 3000, confidence: "observed", sourceIds: [] }, "cost")).toContain(
      "cost: observed values require at least one source",
    );
  });

  it("allows screenshot-observed values in exact cost math", () => {
    expect(canUseExactValue({ value: 3000, confidence: "observed", sourceIds: ["user-tree-full-a"] })).toBe(true);
    expect(canUseExactValue({ confidence: "partial", sourceIds: ["community-lead"] })).toBe(false);
  });
});

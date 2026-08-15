import { describe, expect, it } from "vitest";
import { treeNodesV2 } from "./nodes";
import { topologySlotsV2 } from "./topologySlots";
import { validateV2Dataset } from "./validate";

describe("expanded screenshot topology", () => {
  it("keeps all observed structural slots linked to real nodes", () => {
    const combined = [...treeNodesV2, ...topologySlotsV2];
    expect(combined.length).toBeGreaterThan(100);
    expect(validateV2Dataset(combined).errors).toEqual([]);
  });

  it("never makes geometry-only slots investable", () => {
    expect(topologySlotsV2.every((node) => node.investable === false)).toBe(true);
    expect(topologySlotsV2.every((node) => node.fieldConfidence.effect === "unknown")).toBe(true);
  });
});

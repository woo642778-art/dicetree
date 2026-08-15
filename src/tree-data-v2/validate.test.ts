import { describe, expect, it } from "vitest";
import type { TreeNodeV2 } from "../domain/types";
import { treeNodesV2 } from "./nodes";
import { validateV2Dataset } from "./validate";

describe("V2 screenshot dataset", () => {
  it("has no structural or provenance errors", () => {
    expect(validateV2Dataset(treeNodesV2).errors).toEqual([]);
  });

  it("contains the five observed family trunks and screenshot-derived ranked nodes", () => {
    expect(new Set(treeNodesV2.map((node) => node.family))).toEqual(
      new Set(["core", "nature", "chaos", "engineering", "magic", "order"]),
    );
    expect(treeNodesV2.some((node) => node.displayedRank?.value?.max === 100)).toBe(true);
    expect(treeNodesV2.some((node) => node.observedNextCost?.value?.prismCube === 10)).toBe(true);
  });

  it("rejects broken prerequisite links", () => {
    const broken: TreeNodeV2 = {
      ...treeNodesV2[0],
      id: "broken",
      prerequisites: [{ nodeId: "does-not-exist", minRank: 1 }],
    };
    expect(validateV2Dataset([...treeNodesV2, broken]).errors).toContain(
      "broken: missing prerequisite does-not-exist",
    );
  });
});

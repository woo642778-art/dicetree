import { describe, expect, it } from "vitest";
import { parseClientDiffV47, summarizePatchImpactV47 } from "./patchImpact";

describe("patch impact analyzer", () => {
  it("summarizes semantic client diff output and active-deck impact", () => {
    const diff = parseClientDiffV47(JSON.stringify({
      diceStats: [{ diceId: "predator", change: "changed", old: { baseStats: { attack: 100, attackInterval: 2 } }, new: { baseStats: { attack: 90, attackInterval: 2 } } }],
      treeCosts: [{ nodeId: "n1", change: "changed" }], treeTopology: [],
    }));
    const result = summarizePatchImpactV47(diff, ["predator", "ice"], { n1: 2 });
    expect(result.changedDiceIds).toEqual(["predator"]);
    expect(result.affectedActiveDiceIds).toEqual(["predator"]);
    expect(result.changedTreeNodeIds).toEqual(["n1"]);
    expect(result.affectedInvestedTreeNodeIds).toEqual(["n1"]);
    expect(result.basicDpsDeltas[0].percent).toBeCloseTo(-10);
  });

  it("rejects malformed diff sections", () => {
    expect(() => parseClientDiffV47('{"diceStats":{}}')).toThrow("diceStats must be an array");
  });
});

import { describe, expect, it } from "vitest";
import { treeNodesV2 } from "./nodes";
import "./currentCorrections";

const byId = new Map(treeNodesV2.map((node) => [node.id, node]));

describe("current-game evidence corrections", () => {
  it("does not invent the current rank of the observed global bullet node", () => {
    expect(byId.get("global-bullet-observed-next")?.displayedRank).toBeUndefined();
    expect(byId.get("global-bullet-observed-next")?.maxRank.value).toBe(50);
  });

  it("does not convert a 7.5% attack-speed value into a fake 7/100 rank", () => {
    expect(byId.get("chaos-attack-speed-observed-next")?.displayedRank).toBeUndefined();
    expect(byId.get("chaos-attack-speed-observed-next")?.fieldConfidence.rank).toBe("unknown");
  });

  it("does not simulate the nearby 16/50 cost until exact attribution is confirmed", () => {
    const node = byId.get("chaos-rank-16-50");
    expect(node?.displayedRank?.value).toEqual({ current: 16, max: 50 });
    expect(node?.observedNextCost?.confidence).toBe("partial");
    expect(node?.fieldConfidence.cost).toBe("partial");
    expect(node?.investable).toBe(false);
  });
});

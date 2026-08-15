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
});

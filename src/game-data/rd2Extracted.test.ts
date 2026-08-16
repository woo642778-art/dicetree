import { describe, expect, it } from "vitest";
import { rd2TreeNodes, TREE_RESOURCE_IDS } from "./rd2Extracted";

describe("IPA-sourced Random Dice 2 tree data", () => {
  it("uses the exact 239-node graph and only the two actual tree currencies", () => {
    expect(rd2TreeNodes).toHaveLength(239);
    expect(TREE_RESOURCE_IDS).toEqual(["gold", "nodeStone"]);
  });

  it("preserves exact node coordinates, links and full rank cost arrays from DiceTreeNodeTable", () => {
    const node = rd2TreeNodes.find((entry) => entry.id === 1201);
    expect(node).toBeDefined();
    expect(node?.position).toEqual({ x: -250, y: 600 });
    expect(node?.nextNodeIds).toEqual([1301, 1401]);
    expect(node?.goldByRank.slice(0, 12)).toEqual([
      2000, 800, 800, 800, 800, 1600, 1600, 1600, 1600, 1600, 2500, 2500,
    ]);
    expect(node?.nodeStoneByRank.slice(0, 12)).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0]);
  });

  it("maps internal Invader/Guardian families to the Korean in-game Chaos/Order labels", () => {
    const predator = rd2TreeNodes.find((entry) => entry.nodeType === "DICE" && entry.kindId === 50);
    expect(predator?.family).toBe("chaos");
    expect(predator?.name.ko).toBe("포식 주사위");
  });
});

import { describe, expect, it } from "vitest";
import { strategyNotes } from "./strategyNotes";
import { treeNodesV2 } from "../tree-data-v2/nodes";

describe("strategy notes", () => {
  it("are explicitly non-canonical and cannot silently replace tree facts", () => {
    expect(strategyNotes.every((note) => note.canonicalDataImpact === false)).toBe(true);
    const before = JSON.stringify(treeNodesV2);
    void strategyNotes.map((note) => note.summary.ko);
    expect(JSON.stringify(treeNodesV2)).toBe(before);
  });
});

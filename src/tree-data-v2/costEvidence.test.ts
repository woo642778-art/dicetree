import { describe, expect, it } from "vitest";
import { costEvidence, getCostEvidenceForNode, getCostResearchStats } from "./costEvidence";

describe("Random Dice 2 rank cost evidence", () => {
  it("keeps observed rank costs tied to their photographed rank context", () => {
    const evidence = getCostEvidenceForNode("order-rank-17-50");
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ fromRank: 17, toRank: 18, cost: { gold: 4000 }, confidence: "observed" }),
    ]));
  });

  it("does not manufacture a full ladder from one observed next cost", () => {
    const evidence = getCostEvidenceForNode("global-bullet-observed-next");
    expect(evidence).toHaveLength(1);
    expect(evidence[0].fromRank).toBeUndefined();
    expect(evidence[0].cost).toEqual({ gold: 3000 });
  });

  it("tracks multi-resource costs without renaming unverified currencies", () => {
    expect(costEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: "magic-green-cap", cost: { gold: 100000, blueCard: 20, prismCube: 10 } }),
      expect.objectContaining({ nodeId: "nature-cap-50000", cost: { gold: 50000, prismCube: 10 } }),
    ]));
  });

  it("reports research coverage separately from missing level ladders", () => {
    const stats = getCostResearchStats();
    expect(stats.observations).toBeGreaterThanOrEqual(20);
    expect(stats.nodesWithExactRankContext).toBeGreaterThanOrEqual(7);
    expect(stats.completeLadders).toBe(0);
  });
});

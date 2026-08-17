import { describe, expect, it } from "vitest";
import { CO_OP_RANKING_SNAPSHOT } from "./coOpRankingSnapshot";
import { clusterMetaDecksV48, metaEnvironmentScoresV48 } from "./metaIntelligenceV48";

describe("meta intelligence V4.8", () => {
  it("clusters every observed deck exactly once", () => {
    const clusters = clusterMetaDecksV48(CO_OP_RANKING_SNAPSHOT);
    expect(clusters.reduce((sum, cluster) => sum + cluster.decks, 0)).toBe(CO_OP_RANKING_SNAPSHOT.length);
    expect(clusters[0].coreDiceIds.length).toBeGreaterThan(0);
    expect(clusters.every((cluster) => cluster.share > 0 && cluster.share <= 1)).toBe(true);
  });

  it("returns bounded environment scores", () => {
    const scores = metaEnvironmentScoresV48(CO_OP_RANKING_SNAPSHOT);
    expect(Object.values(scores).every((score) => score >= 0 && score <= 100)).toBe(true);
  });
});

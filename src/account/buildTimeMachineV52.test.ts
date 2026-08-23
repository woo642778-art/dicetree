import { describe, expect, it } from "vitest";
import { compareBuildSnapshotsV52, type BuildSnapshotV52 } from "./buildTimeMachineV52";

function snapshot(overrides: Partial<BuildSnapshotV52>): BuildSnapshotV52 {
  return { id: "x", at: "2026-08-01T00:00:00.000Z", label: "A", deckIds: [], ownedRanks: {}, simulatedRanks: {}, inventory: { gold: 0, stone: 0 }, invested: { gold: 0, stone: 0 }, dps: 100, confidence: "verified", ...overrides };
}

describe("build time machine V5.2", () => {
  it("compares investment, elapsed days, ranks and DPS", () => {
    const delta = compareBuildSnapshotsV52(snapshot({ ownedRanks: { a: 1 } }), snapshot({ at: "2026-08-08T00:00:00.000Z", ownedRanks: { a: 2, b: 1 }, invested: { gold: 82_000, stone: 20 }, dps: 127.4 }));
    expect(delta).toMatchObject({ days: 7, goldDelta: 82_000, coreDelta: 20, addedNodeRanks: 2 });
    expect(delta.dpsPercent).toBeCloseTo(27.4);
  });
});

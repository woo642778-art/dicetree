import { describe, expect, it } from "vitest";
import type { CanonicalGameData } from "./types";
import { validateCanonicalGameData } from "./validate";

const baseData = (): CanonicalGameData => ({
  manifest: {
    schemaVersion: 3,
    clientVersion: "1.0.1",
    sourceSha256: "x",
    extractorVersion: "0.1.0",
    extractedAt: "2026-08-16T00:00:00Z",
  },
  dice: [],
  passives: [],
  runes: [],
  enemies: [],
  localization: { ko: {}, en: {} },
  tree: [],
});

describe("validateCanonicalGameData", () => {
  it("rejects non-Gold/Stone Dice Tree currency fields", () => {
    const invalid = baseData() as unknown as Record<string, unknown>;
    invalid.tree = [{
      id: "n1",
      family: "chaos",
      kind: "passive",
      position: { x: 0, y: 0 },
      prerequisites: [],
      maxRank: 1,
      sourceRefs: [],
      costsByRank: [{ gold: 1000, stone: 0, blueCard: 1 }],
    }];
    expect(() => validateCanonicalGameData(invalid as unknown as CanonicalGameData)).toThrow(/gold.*stone/i);
  });

  it("requires one explicit Gold/Stone cost entry per rank", () => {
    const invalid = baseData();
    invalid.tree = [{
      id: "n1",
      family: "chaos",
      kind: "passive",
      position: { x: 0, y: 0 },
      prerequisites: [],
      maxRank: 2,
      sourceRefs: [],
      costsByRank: [{ gold: 1000, stone: 0 }],
    }];
    expect(() => validateCanonicalGameData(invalid)).toThrow(/length.*maxRank/i);
  });

  it("rejects prerequisites that reference an unknown node", () => {
    const invalid = baseData();
    invalid.tree = [{
      id: "n1",
      family: "chaos",
      kind: "passive",
      position: { x: 0, y: 0 },
      prerequisites: [{ nodeId: "missing", minRank: 1 }],
      maxRank: 1,
      sourceRefs: [],
      costsByRank: [{ gold: 1000, stone: 0 }],
    }];
    expect(() => validateCanonicalGameData(invalid)).toThrow(/unknown node missing/i);
  });

  it("accepts a valid Gold/Stone-only dataset", () => {
    const valid = baseData();
    valid.tree = [{
      id: "n1",
      family: "chaos",
      kind: "passive",
      position: { x: 0, y: 0 },
      prerequisites: [],
      maxRank: 1,
      sourceRefs: ["ipa:DiceTreeNodeTable:n1"],
      costsByRank: [{ gold: 1000, stone: 0 }],
    }];
    expect(validateCanonicalGameData(valid)).toBe(valid);
  });
});

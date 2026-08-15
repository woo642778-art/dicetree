import type {
  DiceFamily,
  LocalizedText,
  ResourceCostV2,
  TreeNodeKind,
  TreeNodeV2,
} from "../domain/types";
import { sourced, unknown } from "../domain/provenance";

const TREE_SOURCE = ["user-tree-full-a", "user-tree-full-b"];
const PRIOR_DETAIL_SOURCE = ["user-prior-stat-details"];

interface ScreenshotNodeInput {
  id: string;
  family: DiceFamily | "core";
  kind: TreeNodeKind;
  x: number;
  y: number;
  parent?: string;
  parents?: string[];
  currentRank?: number;
  maxRank?: number;
  nextCost?: ResourceCostV2;
  name?: LocalizedText;
  nameSources?: string[];
  iconKey?: string;
  effect?: LocalizedText;
  effectSources?: string[];
  tags?: string[];
  investable?: boolean;
  familyConfidence?: "verified" | "observed" | "partial" | "inferred";
}

function screenshotNode(input: ScreenshotNodeInput): TreeNodeV2 {
  const parents = input.parents ?? (input.parent ? [input.parent] : []);
  const name = input.name
    ? sourced(input.name, "partial", input.nameSources ?? TREE_SOURCE)
    : unknown<LocalizedText>("The screenshot establishes this node slot, but its official node name is not readable.");
  const maxRank = input.maxRank !== undefined
    ? sourced(input.maxRank, "observed", TREE_SOURCE)
    : unknown<number>("Maximum rank is not readable in the supplied overview screenshot.");
  const displayedRank = input.currentRank !== undefined && input.maxRank !== undefined
    ? sourced({ current: input.currentRank, max: input.maxRank }, "observed", TREE_SOURCE)
    : undefined;
  const observedNextCost = input.nextCost
    ? sourced(input.nextCost, "observed", TREE_SOURCE, "Cost displayed beside this node in the supplied in-game tree screenshot.")
    : undefined;
  const effectSummary = input.effect
    ? sourced(input.effect, "partial", input.effectSources ?? PRIOR_DETAIL_SOURCE)
    : unknown<LocalizedText>("Open the node detail panel in-game to verify the exact effect wording and scaling.");

  return {
    id: input.id,
    family: input.family,
    kind: input.kind,
    position: { x: input.x, y: input.y },
    prerequisites: parents.map((nodeId) => ({ nodeId, minRank: 1 })),
    visualParentIds: parents,
    name,
    iconKey: input.iconKey ? sourced(input.iconKey, "observed", TREE_SOURCE) : undefined,
    maxRank,
    displayedRank,
    observedNextCost,
    observedNextCostFromRank: input.currentRank,
    effectSummary,
    tags: input.tags ?? [],
    sourceIds: [...new Set([...TREE_SOURCE, ...(input.nameSources ?? []), ...(input.effectSources ?? [])])],
    fieldConfidence: {
      position: "observed",
      prerequisites: parents.length ? "observed" : input.family === "core" ? "verified" : "partial",
      family: input.familyConfidence ?? (input.family === "core" ? "verified" : "observed"),
      cost: input.nextCost ? "observed" : "unknown",
      rank: input.maxRank !== undefined ? "observed" : "unknown",
      effect: input.effect ? "partial" : "unknown",
    },
    investable: input.investable ?? Boolean(input.maxRank && input.nextCost),
  };
}

/**
 * World coordinates are hand-calibrated from the supplied full-tree screenshots.
 * They intentionally follow the game's irregular graph instead of V1's synthetic polar layout.
 */
export const treeNodesV2: TreeNodeV2[] = [
  screenshotNode({ id: "tree-core", family: "core", kind: "core", x: 0, y: 0, name: { ko: "다이스 트리", en: "Dice Tree" }, nameSources: TREE_SOURCE, iconKey: "tree-core", tags: ["core"], familyConfidence: "verified" }),

  screenshotNode({ id: "nature-root-dice", family: "nature", kind: "dice", x: 0, y: -145, parent: "tree-core", iconKey: "nature-red-flower", tags: ["trunk"] }),
  screenshotNode({ id: "nature-root-stat-left", family: "nature", kind: "stat", x: -58, y: -145, parent: "nature-root-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "nature-rank-5-100", family: "nature", kind: "stat", x: -92, y: -285, parent: "nature-root-dice", currentRank: 5, maxRank: 100, nextCost: { gold: 2000, blueCard: 1 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "nature-water-dice", family: "nature", kind: "dice", x: 10, y: -345, parent: "nature-root-dice", iconKey: "blue-vortex", tags: ["dice"] }),
  screenshotNode({ id: "nature-water-stat", family: "nature", kind: "stat", x: -40, y: -390, parent: "nature-water-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "nature-snow-dice", family: "nature", kind: "dice", x: 110, y: -345, parent: "nature-root-dice", iconKey: "cyan-snow", tags: ["dice"] }),
  screenshotNode({ id: "nature-snow-stat", family: "nature", kind: "stat", x: 145, y: -300, parent: "nature-snow-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "nature-dark-dice", family: "nature", kind: "dice", x: 110, y: -470, parent: "nature-water-dice", iconKey: "dark-square", tags: ["dice"] }),
  screenshotNode({ id: "nature-dark-cost-5", family: "nature", kind: "stat", x: 110, y: -515, parent: "nature-dark-dice", nextCost: { prismCube: 5 }, tags: ["resource-gate"] }),
  screenshotNode({ id: "nature-upper-stat-3000", family: "nature", kind: "stat", x: 40, y: -535, parent: "nature-dark-dice", nextCost: { gold: 3000 }, tags: ["stat"] }),
  screenshotNode({ id: "nature-upper-purple-dice", family: "nature", kind: "dice", x: -110, y: -520, parent: "nature-rank-5-100", iconKey: "lavender-star", tags: ["dice"] }),
  screenshotNode({ id: "nature-upper-rank-2-50", family: "nature", kind: "stat", x: -60, y: -580, parent: "nature-upper-purple-dice", currentRank: 2, maxRank: 50, nextCost: { gold: 3000 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "nature-cap-50000", family: "nature", kind: "milestone", x: -165, y: -575, parent: "nature-upper-purple-dice", nextCost: { gold: 50000, prismCube: 10 }, tags: ["milestone"] }),
  screenshotNode({ id: "nature-cap-100000", family: "nature", kind: "capstone", x: -75, y: -655, parent: "nature-upper-rank-2-50", nextCost: { gold: 100000, prismCube: 20 }, tags: ["capstone"] }),
  screenshotNode({ id: "nature-top-end", family: "nature", kind: "capstone", x: -15, y: -790, parent: "nature-cap-100000", nextCost: { gold: 100000, prismCube: 10 }, tags: ["capstone"] }),

  screenshotNode({ id: "chaos-root-dice", family: "chaos", kind: "dice", x: -155, y: -10, parent: "tree-core", iconKey: "red-blue-yinyang", tags: ["trunk"] }),
  screenshotNode({ id: "chaos-root-stat", family: "chaos", kind: "stat", x: -155, y: 42, parent: "chaos-root-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "chaos-rank-5-100", family: "chaos", kind: "stat", x: -250, y: -10, parent: "chaos-root-dice", currentRank: 5, maxRank: 100, nextCost: { gold: 2000, blueCard: 1 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "chaos-teal-dice", family: "chaos", kind: "dice", x: -330, y: -115, parent: "chaos-rank-5-100", iconKey: "teal-clock", tags: ["dice"] }),
  screenshotNode({ id: "chaos-purple-dice", family: "chaos", kind: "dice", x: -440, y: -115, parent: "chaos-teal-dice", iconKey: "purple-curve", tags: ["dice"] }),
  screenshotNode({ id: "chaos-rank-16-50", family: "chaos", kind: "stat", x: -475, y: -165, parent: "chaos-purple-dice", currentRank: 16, maxRank: 50, nextCost: { gold: 5000, prismCube: 10 }, iconKey: "purple-stat", tags: ["rankable"] }),
  screenshotNode({ id: "chaos-rank-4-50", family: "chaos", kind: "stat", x: -555, y: -115, parent: "chaos-purple-dice", currentRank: 4, maxRank: 50, nextCost: { gold: 3000 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "chaos-upper-special", family: "chaos", kind: "dice", x: -500, y: -260, parent: "chaos-purple-dice", iconKey: "black-white-character", nextCost: { prismCube: 12 }, tags: ["dice", "special"] }),
  screenshotNode({ id: "chaos-cap-100000", family: "chaos", kind: "capstone", x: -455, y: -215, parent: "chaos-upper-special", nextCost: { gold: 100000, prismCube: 20 }, tags: ["capstone"] }),
  screenshotNode({ id: "chaos-lower-dark", family: "chaos", kind: "dice", x: -330, y: 80, parent: "chaos-rank-5-100", iconKey: "dark-square", nextCost: { prismCube: 3 }, tags: ["dice"] }),
  screenshotNode({ id: "chaos-attack-speed-observed-next", family: "chaos", kind: "stat", x: -405, y: -40, parent: "chaos-purple-dice", currentRank: 7, maxRank: 100, nextCost: { gold: 3000 }, name: { ko: "혼돈 계열 공격속도", en: "Chaos Attack Speed" }, nameSources: PRIOR_DETAIL_SOURCE, effect: { ko: "다음 랭크에서 혼돈 계열 공격속도 +0.5%p", en: "Next rank: Chaos attack speed +0.5 percentage points" }, effectSources: PRIOR_DETAIL_SOURCE, tags: ["attack-speed", "chaos", "combat"] }),

  screenshotNode({ id: "engineering-root-dice", family: "engineering", kind: "dice", x: -95, y: 155, parent: "tree-core", iconKey: "grey-tiles", tags: ["trunk"] }),
  screenshotNode({ id: "engineering-root-stat", family: "engineering", kind: "stat", x: -145, y: 155, parent: "engineering-root-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "engineering-dark-dice", family: "engineering", kind: "dice", x: -95, y: 235, parent: "engineering-root-dice", iconKey: "dark-gear", nextCost: { prismCube: 5 }, tags: ["dice"] }),
  screenshotNode({ id: "engineering-teal-dice", family: "engineering", kind: "dice", x: -240, y: 250, parent: "engineering-root-dice", iconKey: "teal-gear", tags: ["dice"] }),
  screenshotNode({ id: "engineering-pink-dice", family: "engineering", kind: "dice", x: -375, y: 250, parent: "engineering-teal-dice", iconKey: "pink-arrows", tags: ["dice"] }),
  screenshotNode({ id: "engineering-pink-stat", family: "engineering", kind: "stat", x: -420, y: 292, parent: "engineering-pink-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "engineering-rank-5-100", family: "engineering", kind: "stat", x: -260, y: 335, parent: "engineering-teal-dice", currentRank: 5, maxRank: 100, nextCost: { gold: 2000, blueCard: 1 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "engineering-special-12", family: "engineering", kind: "dice", x: -260, y: 445, parent: "engineering-rank-5-100", iconKey: "black-white-character", nextCost: { prismCube: 12 }, tags: ["dice", "special"] }),
  screenshotNode({ id: "engineering-special-30000", family: "engineering", kind: "stat", x: -200, y: 480, parent: "engineering-special-12", nextCost: { gold: 30000, prismCube: 10 }, tags: ["milestone"] }),
  screenshotNode({ id: "engineering-end-8000", family: "engineering", kind: "capstone", x: -465, y: 470, parent: "engineering-pink-dice", nextCost: { gold: 8000 }, tags: ["capstone"] }),

  screenshotNode({ id: "magic-root-dice", family: "magic", kind: "dice", x: 105, y: 155, parent: "tree-core", iconKey: "yellow-lightning", tags: ["trunk"] }),
  screenshotNode({ id: "magic-root-stat", family: "magic", kind: "stat", x: 105, y: 205, parent: "magic-root-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "magic-rank-5-100", family: "magic", kind: "stat", x: 205, y: 250, parent: "magic-root-dice", currentRank: 5, maxRank: 100, nextCost: { gold: 2000, blueCard: 1 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "magic-green-dice", family: "magic", kind: "dice", x: 205, y: 365, parent: "magic-rank-5-100", iconKey: "green-target", tags: ["dice"] }),
  screenshotNode({ id: "magic-green-cap", family: "magic", kind: "milestone", x: 205, y: 410, parent: "magic-green-dice", nextCost: { gold: 100000, blueCard: 20, prismCube: 10 }, tags: ["milestone"] }),
  screenshotNode({ id: "magic-rank-1-15", family: "magic", kind: "stat", x: 205, y: 480, parent: "magic-green-dice", currentRank: 1, maxRank: 15, nextCost: { gold: 4000 }, iconKey: "speed-glyph", tags: ["rankable", "speed"] }),
  screenshotNode({ id: "magic-cyan-dice", family: "magic", kind: "dice", x: 315, y: 480, parent: "magic-rank-1-15", iconKey: "cyan-clover", nextCost: { gold: 2000 }, tags: ["dice"] }),
  screenshotNode({ id: "magic-lower-cap", family: "magic", kind: "capstone", x: 265, y: 555, parent: "magic-cyan-dice", nextCost: { gold: 100000, blueCard: 20, prismCube: 10 }, tags: ["capstone"] }),

  screenshotNode({ id: "order-root-dice", family: "order", kind: "dice", x: 165, y: -10, parent: "tree-core", iconKey: "magenta-orb", tags: ["trunk"] }),
  screenshotNode({ id: "order-root-stat", family: "order", kind: "stat", x: 165, y: 42, parent: "order-root-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "order-rank-5-100", family: "order", kind: "stat", x: 290, y: 80, parent: "order-root-dice", currentRank: 5, maxRank: 100, nextCost: { gold: 2000, blueCard: 1 }, iconKey: "family-stat", tags: ["rankable"] }),
  screenshotNode({ id: "order-beige-dice", family: "order", kind: "dice", x: 285, y: -145, parent: "order-root-dice", iconKey: "beige-frame", tags: ["dice"] }),
  screenshotNode({ id: "order-speed-max", family: "order", kind: "stat", x: 405, y: -145, parent: "order-beige-dice", currentRank: 1, maxRank: 1, iconKey: "speed-glyph", tags: ["speed", "max"] }),
  screenshotNode({ id: "order-link-stat", family: "order", kind: "stat", x: 520, y: -145, parent: "order-speed-max", iconKey: "order-glyph", tags: ["stat"] }),
  screenshotNode({ id: "order-purple-dice", family: "order", kind: "dice", x: 405, y: 10, parent: "order-rank-5-100", iconKey: "purple-bolt", tags: ["dice"] }),
  screenshotNode({ id: "order-rank-17-50", family: "order", kind: "stat", x: 455, y: -35, parent: "order-purple-dice", currentRank: 17, maxRank: 50, nextCost: { gold: 4000 }, iconKey: "purple-stat", tags: ["rankable"] }),
  screenshotNode({ id: "order-special-12", family: "order", kind: "dice", x: 405, y: 85, parent: "order-rank-5-100", iconKey: "black-white-character", nextCost: { prismCube: 12 }, tags: ["dice", "special"] }),
  screenshotNode({ id: "order-special-cap", family: "order", kind: "milestone", x: 405, y: 130, parent: "order-special-12", nextCost: { gold: 30000, prismCube: 10 }, tags: ["milestone"] }),
  screenshotNode({ id: "order-upper-red-dice", family: "order", kind: "dice", x: 500, y: -260, parent: "order-beige-dice", iconKey: "red-spiral", tags: ["dice"] }),
  screenshotNode({ id: "order-upper-stat", family: "order", kind: "stat", x: 450, y: -305, parent: "order-upper-red-dice", nextCost: { gold: 2000 }, tags: ["stat"] }),
  screenshotNode({ id: "global-bullet-observed-next", family: "order", kind: "stat", x: 350, y: 135, parent: "order-rank-5-100", currentRank: 1, maxRank: 50, nextCost: { gold: 3000 }, name: { ko: "모든 주사위 불렛 데미지", en: "All Dice Bullet Damage" }, nameSources: PRIOR_DETAIL_SOURCE, effect: { ko: "다음 랭크에서 불렛 데미지 +1.2%p", en: "Next rank: bullet damage +1.2 percentage points" }, effectSources: PRIOR_DETAIL_SOURCE, tags: ["bullet-damage", "global", "combat"] }),
  screenshotNode({ id: "global-bullet-milestone-15", family: "order", kind: "milestone", x: 455, y: 170, parent: "global-bullet-observed-next", currentRank: 0, maxRank: 1, nextCost: { gold: 15000 }, name: { ko: "모든 주사위 불렛 데미지", en: "All Dice Bullet Damage" }, nameSources: PRIOR_DETAIL_SOURCE, effect: { ko: "모든 주사위 불렛 데미지 +15%", en: "All dice bullet damage +15%" }, effectSources: PRIOR_DETAIL_SOURCE, tags: ["bullet-damage", "global", "milestone"] }),
];

import type { DiceFamily, TreeNodeDefinition } from "../domain/types";

const checkedAt = "2026-08-15";

const familyLayout: Array<{ family: DiceFamily; angle: number }> = [
  { family: "order", angle: -126 },
  { family: "magic", angle: -54 },
  { family: "engineering", angle: 18 },
  { family: "nature", angle: 90 },
  { family: "chaos", angle: 162 },
];

function polar(radius: number, degrees: number) {
  const r = (degrees * Math.PI) / 180;
  return { x: Math.cos(r) * radius, y: Math.sin(r) * radius };
}

function unverifiedFamilyNodes(family: DiceFamily, angle: number): TreeNodeDefinition[] {
  const nodes: TreeNodeDefinition[] = [];
  const hubId = `${family}-unknown-hub`;
  nodes.push({
    id: hubId,
    family,
    position: polar(225, angle),
    maxRank: 1,
    prerequisites: [],
    levels: [],
    localizationKey: "node.unverified",
    verification: {
      status: "unverified",
      checkedAt,
      sourceLabel: "Approximate visual slot",
      notes: "Position is planner-only geometry. The hidden in-game node identity/effect is not asserted.",
    },
    tags: ["unverified", "visual-slot"],
    investable: false,
    routeKnown: false,
  });

  for (let branch = 0; branch < 3; branch += 1) {
    let parentId = hubId;
    for (let depth = 1; depth <= 6; depth += 1) {
      const id = `${family}-unknown-${branch + 1}-${depth}`;
      const spread = (branch - 1) * (9 + depth * 1.7);
      const position = polar(225 + depth * 118, angle + spread);
      nodes.push({
        id,
        family,
        position,
        maxRank: 1,
        prerequisites: [],
        visualParentIds: [parentId],
        levels: [],
        localizationKey: "node.unverified",
        verification: {
          status: "unverified",
          checkedAt,
          sourceLabel: "Approximate visual slot",
          notes: "Shown to expose the unexplored tree area without inventing game data.",
        },
        tags: ["unverified", "visual-slot"],
        investable: false,
        routeKnown: false,
      });
      parentId = id;
    }
  }
  return nodes;
}

const placeholders = familyLayout.flatMap(({ family, angle }) => unverifiedFamilyNodes(family, angle));

const observed: TreeNodeDefinition[] = [
  {
    id: "global-bullet-observed-next",
    family: "order",
    position: { x: -120, y: -64 },
    maxRank: 1,
    prerequisites: [],
    visualParentIds: ["order-unknown-hub"],
    levels: [
      {
        rank: 1,
        costs: { gold: 3000 },
        costsKnown: true,
        effects: [
          { kind: "bulletDamagePercent", amount: 1.2, appliesTo: "all", verifiedFormula: false },
        ],
        effectsKnown: true,
      },
    ],
    localizationKey: "node.globalBulletObserved",
    verification: {
      status: "partial",
      checkedAt,
      sourceLabel: "User-provided in-game screenshot",
      notes: "Observed next step: +1.2% bullet damage for 3,000 gold. Full 50-rank cost table and route are not inferred.",
    },
    tags: ["damage", "global", "observed-step"],
    investable: true,
    routeKnown: false,
  },
  {
    id: "global-bullet-milestone-15",
    family: "order",
    position: { x: 54, y: -155 },
    maxRank: 1,
    prerequisites: [],
    visualParentIds: ["order-unknown-hub"],
    levels: [
      {
        rank: 1,
        costs: { gold: 15000 },
        costsKnown: true,
        effects: [
          { kind: "bulletDamagePercent", amount: 15, appliesTo: "all", verifiedFormula: false },
        ],
        effectsKnown: true,
      },
    ],
    localizationKey: "node.globalBulletMilestone",
    verification: {
      status: "partial",
      checkedAt,
      sourceLabel: "User-provided in-game screenshot",
      notes: "The displayed +15% milestone and 15,000 gold cost are observed; its prerequisite route is not verified.",
    },
    tags: ["damage", "global", "milestone"],
    investable: true,
    routeKnown: false,
  },
  {
    id: "chaos-attack-speed-observed-next",
    family: "chaos",
    position: { x: -195, y: 132 },
    maxRank: 1,
    prerequisites: [],
    visualParentIds: ["chaos-unknown-hub"],
    levels: [
      {
        rank: 1,
        costs: { gold: 3000 },
        costsKnown: true,
        effects: [
          { kind: "attackSpeedPercent", amount: 0.5, appliesTo: "chaos", verifiedFormula: false },
        ],
        effectsKnown: true,
      },
    ],
    localizationKey: "node.chaosAttackSpeedObserved",
    verification: {
      status: "partial",
      checkedAt,
      sourceLabel: "User-provided in-game screenshot",
      notes: "Observed 6→7 upgrade step: +0.5 percentage points for 3,000 gold. The game's attack-speed DPS formula is not asserted.",
    },
    tags: ["attack-speed", "chaos", "observed-step"],
    investable: true,
    routeKnown: false,
  },
  {
    id: "order-attack-speed-location",
    family: "order",
    position: { x: -265, y: -228 },
    maxRank: 1,
    prerequisites: [],
    visualParentIds: ["order-unknown-hub"],
    levels: [],
    localizationKey: "node.orderAttackSpeedUnknown",
    verification: {
      status: "unverified",
      checkedAt,
      sourceLabel: "Visual icon match from user-provided tree screenshot",
      notes: "Likely Order attack-speed node location only. Numeric effect, rank table, and path remain unverified.",
    },
    tags: ["attack-speed", "order", "unverified"],
    investable: false,
    routeKnown: false,
  },
];

export const treeNodes: TreeNodeDefinition[] = [...placeholders, ...observed];

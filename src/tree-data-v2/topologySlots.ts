import type { DiceFamily, TreeNodeKind, TreeNodeV2 } from "../domain/types";
import { unknown } from "../domain/provenance";

const SOURCES = ["user-tree-full-a", "user-tree-full-b"];

interface SlotInput {
  id: string;
  family: DiceFamily;
  kind: TreeNodeKind;
  x: number;
  y: number;
  parent: string;
}

function slot({ id, family, kind, x, y, parent }: SlotInput): TreeNodeV2 {
  return {
    id,
    family,
    kind,
    position: { x, y },
    prerequisites: [{ nodeId: parent, minRank: 1 }],
    visualParentIds: [parent],
    name: unknown("The node slot and connection are visible in the supplied full-tree screenshots; exact identity needs a detail-panel source."),
    maxRank: unknown("Maximum rank is not readable at this zoom."),
    effectSummary: unknown("Exact effect is not readable in the overview screenshot."),
    tags: ["topology", "screenshot-slot"],
    sourceIds: SOURCES,
    fieldConfidence: {
      position: "observed",
      prerequisites: "observed",
      family: "inferred",
      cost: "unknown",
      rank: "unknown",
      effect: "unknown",
    },
    investable: false,
  };
}

/**
 * Outer grey branches visible in the supplied full-tree views. These entries
 * deliberately carry geometry only. They make the planner resemble the real
 * graph without fabricating names, effects, ranks, or prices.
 */
export const topologySlotsV2: TreeNodeV2[] = [
  // Nature: broad upper canopy visible beyond the currently identified trunk.
  slot({ id: "nature-slot-a1", family: "nature", kind: "connector", x: -300, y: -430, parent: "nature-upper-purple-dice" }),
  slot({ id: "nature-slot-a2", family: "nature", kind: "stat", x: -430, y: -430, parent: "nature-slot-a1" }),
  slot({ id: "nature-slot-a3", family: "nature", kind: "dice", x: -555, y: -430, parent: "nature-slot-a2" }),
  slot({ id: "nature-slot-a4", family: "nature", kind: "stat", x: -675, y: -500, parent: "nature-slot-a3" }),
  slot({ id: "nature-slot-a5", family: "nature", kind: "capstone", x: -800, y: -500, parent: "nature-slot-a4" }),
  slot({ id: "nature-slot-a6", family: "nature", kind: "stat", x: -675, y: -360, parent: "nature-slot-a3" }),
  slot({ id: "nature-slot-a7", family: "nature", kind: "dice", x: -555, y: -300, parent: "nature-slot-a6" }),
  slot({ id: "nature-slot-b1", family: "nature", kind: "connector", x: 270, y: -430, parent: "nature-snow-dice" }),
  slot({ id: "nature-slot-b2", family: "nature", kind: "stat", x: 390, y: -500, parent: "nature-slot-b1" }),
  slot({ id: "nature-slot-b3", family: "nature", kind: "dice", x: 515, y: -500, parent: "nature-slot-b2" }),
  slot({ id: "nature-slot-b4", family: "nature", kind: "stat", x: 635, y: -430, parent: "nature-slot-b3" }),
  slot({ id: "nature-slot-b5", family: "nature", kind: "capstone", x: 770, y: -430, parent: "nature-slot-b4" }),
  slot({ id: "nature-slot-b6", family: "nature", kind: "stat", x: 635, y: -570, parent: "nature-slot-b3" }),
  slot({ id: "nature-slot-b7", family: "nature", kind: "dice", x: 515, y: -650, parent: "nature-slot-b6" }),

  // Chaos: long left branches and diamond endpoints in the portrait overview.
  slot({ id: "chaos-slot-a1", family: "chaos", kind: "connector", x: -520, y: -20, parent: "chaos-purple-dice" }),
  slot({ id: "chaos-slot-a2", family: "chaos", kind: "stat", x: -650, y: -20, parent: "chaos-slot-a1" }),
  slot({ id: "chaos-slot-a3", family: "chaos", kind: "dice", x: -770, y: -20, parent: "chaos-slot-a2" }),
  slot({ id: "chaos-slot-a4", family: "chaos", kind: "stat", x: -890, y: -100, parent: "chaos-slot-a3" }),
  slot({ id: "chaos-slot-a5", family: "chaos", kind: "capstone", x: -1010, y: -100, parent: "chaos-slot-a4" }),
  slot({ id: "chaos-slot-a6", family: "chaos", kind: "stat", x: -890, y: 80, parent: "chaos-slot-a3" }),
  slot({ id: "chaos-slot-a7", family: "chaos", kind: "dice", x: -770, y: 150, parent: "chaos-slot-a6" }),
  slot({ id: "chaos-slot-b1", family: "chaos", kind: "connector", x: -520, y: 155, parent: "chaos-lower-dark" }),
  slot({ id: "chaos-slot-b2", family: "chaos", kind: "stat", x: -650, y: 235, parent: "chaos-slot-b1" }),
  slot({ id: "chaos-slot-b3", family: "chaos", kind: "dice", x: -775, y: 300, parent: "chaos-slot-b2" }),
  slot({ id: "chaos-slot-b4", family: "chaos", kind: "capstone", x: -900, y: 300, parent: "chaos-slot-b3" }),

  // Order: long right branches with repeated square hubs and end caps.
  slot({ id: "order-slot-a1", family: "order", kind: "connector", x: 580, y: -145, parent: "order-link-stat" }),
  slot({ id: "order-slot-a2", family: "order", kind: "dice", x: 700, y: -145, parent: "order-slot-a1" }),
  slot({ id: "order-slot-a3", family: "order", kind: "stat", x: 820, y: -145, parent: "order-slot-a2" }),
  slot({ id: "order-slot-a4", family: "order", kind: "capstone", x: 955, y: -145, parent: "order-slot-a3" }),
  slot({ id: "order-slot-a5", family: "order", kind: "stat", x: 820, y: -285, parent: "order-slot-a2" }),
  slot({ id: "order-slot-a6", family: "order", kind: "dice", x: 700, y: -350, parent: "order-slot-a5" }),
  slot({ id: "order-slot-a7", family: "order", kind: "capstone", x: 830, y: -420, parent: "order-slot-a6" }),
  slot({ id: "order-slot-b1", family: "order", kind: "connector", x: 570, y: 20, parent: "order-purple-dice" }),
  slot({ id: "order-slot-b2", family: "order", kind: "dice", x: 700, y: 70, parent: "order-slot-b1" }),
  slot({ id: "order-slot-b3", family: "order", kind: "stat", x: 820, y: 155, parent: "order-slot-b2" }),
  slot({ id: "order-slot-b4", family: "order", kind: "capstone", x: 950, y: 155, parent: "order-slot-b3" }),

  // Engineering: lower-left lattice and two distant terminal branches.
  slot({ id: "engineering-slot-a1", family: "engineering", kind: "connector", x: -360, y: 360, parent: "engineering-teal-dice" }),
  slot({ id: "engineering-slot-a2", family: "engineering", kind: "stat", x: -490, y: 430, parent: "engineering-slot-a1" }),
  slot({ id: "engineering-slot-a3", family: "engineering", kind: "dice", x: -620, y: 430, parent: "engineering-slot-a2" }),
  slot({ id: "engineering-slot-a4", family: "engineering", kind: "stat", x: -750, y: 500, parent: "engineering-slot-a3" }),
  slot({ id: "engineering-slot-a5", family: "engineering", kind: "capstone", x: -885, y: 500, parent: "engineering-slot-a4" }),
  slot({ id: "engineering-slot-a6", family: "engineering", kind: "stat", x: -620, y: 565, parent: "engineering-slot-a3" }),
  slot({ id: "engineering-slot-a7", family: "engineering", kind: "dice", x: -490, y: 640, parent: "engineering-slot-a6" }),
  slot({ id: "engineering-slot-a8", family: "engineering", kind: "capstone", x: -620, y: 735, parent: "engineering-slot-a7" }),
  slot({ id: "engineering-slot-b1", family: "engineering", kind: "connector", x: -260, y: 580, parent: "engineering-special-12" }),
  slot({ id: "engineering-slot-b2", family: "engineering", kind: "dice", x: -130, y: 650, parent: "engineering-slot-b1" }),
  slot({ id: "engineering-slot-b3", family: "engineering", kind: "stat", x: -130, y: 775, parent: "engineering-slot-b2" }),

  // Magic: lower-right staircase and far-right terminal lattice.
  slot({ id: "magic-slot-a1", family: "magic", kind: "connector", x: 385, y: 365, parent: "magic-green-dice" }),
  slot({ id: "magic-slot-a2", family: "magic", kind: "stat", x: 515, y: 430, parent: "magic-slot-a1" }),
  slot({ id: "magic-slot-a3", family: "magic", kind: "dice", x: 640, y: 500, parent: "magic-slot-a2" }),
  slot({ id: "magic-slot-a4", family: "magic", kind: "stat", x: 765, y: 570, parent: "magic-slot-a3" }),
  slot({ id: "magic-slot-a5", family: "magic", kind: "capstone", x: 900, y: 570, parent: "magic-slot-a4" }),
  slot({ id: "magic-slot-a6", family: "magic", kind: "stat", x: 765, y: 705, parent: "magic-slot-a3" }),
  slot({ id: "magic-slot-a7", family: "magic", kind: "dice", x: 640, y: 775, parent: "magic-slot-a6" }),
  slot({ id: "magic-slot-a8", family: "magic", kind: "capstone", x: 770, y: 850, parent: "magic-slot-a7" }),
  slot({ id: "magic-slot-b1", family: "magic", kind: "connector", x: 425, y: 590, parent: "magic-cyan-dice" }),
  slot({ id: "magic-slot-b2", family: "magic", kind: "stat", x: 520, y: 665, parent: "magic-slot-b1" }),
];

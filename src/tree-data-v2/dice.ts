import type { DiceDefinitionV2 } from "../domain/types";
import { sourced } from "../domain/provenance";

const conversationSource = ["user-tree-full-a"];

export const diceV2: DiceDefinitionV2[] = [
  {
    id: "devourer",
    family: "chaos",
    name: sourced({ ko: "포식", en: "Devour" }, "partial", conversationSource, "Name/family are established in current user gameplay context; exact V2 effect text still needs a detail screenshot."),
    roles: ["dealer"],
    tags: ["carry", "stacking", "chaos"],
    sourceIds: conversationSource,
  },
  {
    id: "corruption",
    family: "chaos",
    name: sourced({ ko: "부패", en: "Corruption" }, "partial", conversationSource, "Current user gameplay context confirms it is used alongside Devour and belongs to Chaos."),
    roles: ["dealer", "support"],
    tags: ["chaos", "synergy"],
    sourceIds: conversationSource,
  },
  {
    id: "taeguk",
    family: "order",
    name: sourced({ ko: "태극", en: "Taeguk" }, "partial", conversationSource, "Current user gameplay context confirms Order specialization; exact Random Dice 2 effect text remains source-gated."),
    roles: ["dealer"],
    tags: ["order", "carry", "formation"],
    sourceIds: conversationSource,
  },
  {
    id: "adapt",
    family: "magic",
    name: sourced({ ko: "적응", en: "Adapt" }, "partial", ["community-dc-f2p-1517"], "Community route terminology only until a current detail screenshot is available."),
    roles: ["support", "balanced"],
    tags: ["magic", "utility", "early-route"],
    sourceIds: ["community-dc-f2p-1517"],
  },
  {
    id: "summon",
    family: "magic",
    name: sourced({ ko: "소환", en: "Summon" }, "partial", ["community-dc-f2p-1517"], "Community route terminology only until a current detail screenshot is available."),
    roles: ["support", "balanced"],
    tags: ["magic", "economy", "early-route"],
    sourceIds: ["community-dc-f2p-1517"],
  },
  {
    id: "gear",
    family: "engineering",
    name: sourced({ ko: "기어", en: "Gear" }, "partial", ["community-dc-engineering-317"], "Community route terminology only until a current detail screenshot is available."),
    roles: ["dealer"],
    tags: ["engineering", "early-route"],
    sourceIds: ["community-dc-engineering-317"],
  },
];

import type { DiceDefinition } from "../domain/types";

const userVerified = {
  status: "partial" as const,
  checkedAt: "2026-08-15",
  sourceLabel: "User-provided in-game context",
  notes: "Family/usage context supplied by the player; no unverified numeric skill formula is stored.",
};

export const diceDefinitions: DiceDefinition[] = [
  {
    id: "devourer",
    family: "chaos",
    localizationKey: "dice.devourer",
    roles: ["dealer"],
    verification: userVerified,
    tags: ["dealer", "growth", "chaos"],
  },
  {
    id: "corruption",
    family: "chaos",
    localizationKey: "dice.corruption",
    roles: ["support", "balanced"],
    verification: userVerified,
    tags: ["support", "secondary", "chaos"],
  },
  {
    id: "taiji",
    family: "order",
    localizationKey: "dice.taiji",
    roles: ["dealer"],
    verification: userVerified,
    tags: ["dealer", "order"],
  },
];

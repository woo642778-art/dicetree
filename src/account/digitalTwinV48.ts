import type { PlannerStateV3 } from "../planner-v3/types";
import type { StoredDeckGoalV3, StoredProfileV3, StoredSpendProfileV3 } from "../storage/profileStorageV3";
import type { AccountIdentityV49 } from "./accountImportV49";

export type AccountModeV48 = "coop" | "arena" | "all";
export type AccountUiModeV48 = "beginner" | "advanced";

export interface OwnedDiceV48 {
  owned: boolean;
  level: number;
}

export interface SavedDeckV48 {
  id: string;
  name: string;
  diceIds: string[];
  role: StoredDeckGoalV3;
}

export interface AccountGoalV48 {
  mode: AccountModeV48;
  targetDiceId: string;
  targetDps?: number;
  targetGainPercent?: number;
  maxSpendKrw?: number;
}

export interface AccountPreferencesV48 {
  spendProfile: StoredSpendProfileV3;
  uiMode: AccountUiModeV48;
  lockedDiceIds: string[];
  bannedDiceIds: string[];
  lockedNodeIds: string[];
  bannedNodeIds: string[];
}

export interface AccountResourcesV48 {
  redesignItems: number;
  dailyGold: number;
  dailyCore: number;
}

export interface AccountDecisionV48 {
  id: string;
  at: string;
  kind: "tree" | "deck" | "purchase" | "save";
  label: string;
  reason: string;
}

export interface UserDigitalTwinV48 {
  schemaVersion: 1;
  planner: PlannerStateV3;
  roster: Record<string, OwnedDiceV48>;
  decks: SavedDeckV48[];
  primaryDeckId: string;
  goal: AccountGoalV48;
  preferences: AccountPreferencesV48;
  resources: AccountResourcesV48;
  decisions: AccountDecisionV48[];
  identity?: AccountIdentityV49;
}

export function createDigitalTwinV48(input: {
  planner: PlannerStateV3;
  activeDeckIds: readonly string[];
  deckGoal: StoredDeckGoalV3;
  spendProfile: StoredSpendProfileV3;
}): UserDigitalTwinV48 {
  const diceIds = [...new Set(input.activeDeckIds)].slice(0, 5);
  return {
    schemaVersion: 1,
    planner: structuredClone(input.planner),
    roster: Object.fromEntries(diceIds.map((diceId) => [diceId, { owned: true, level: diceId === input.planner.scenario.diceId ? input.planner.scenario.diceProgressionLevel : 1 }])),
    decks: [{ id: "primary", name: "Primary", diceIds, role: input.deckGoal }],
    primaryDeckId: "primary",
    goal: { mode: "coop", targetDiceId: input.planner.scenario.diceId, targetGainPercent: 10 },
    preferences: {
      spendProfile: input.spendProfile,
      uiMode: "beginner",
      lockedDiceIds: [], bannedDiceIds: [], lockedNodeIds: [], bannedNodeIds: [],
    },
    resources: { redesignItems: 0, dailyGold: 0, dailyCore: 0 },
    decisions: [],
  };
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isDigitalTwinV48(value: unknown): value is UserDigitalTwinV48 {
  if (!value || typeof value !== "object") return false;
  const twin = value as Partial<UserDigitalTwinV48>;
  return twin.schemaVersion === 1 && twin.planner?.schemaVersion === 3
    && Array.isArray(twin.decks) && typeof twin.primaryDeckId === "string"
    && typeof twin.goal?.targetDiceId === "string"
    && ["coop", "arena", "all"].includes(twin.goal?.mode ?? "")
    && ["beginner", "advanced"].includes(twin.preferences?.uiMode ?? "")
    && stringArray(twin.preferences?.lockedDiceIds)
    && stringArray(twin.preferences?.bannedDiceIds)
    && stringArray(twin.preferences?.lockedNodeIds)
    && stringArray(twin.preferences?.bannedNodeIds)
    && typeof twin.resources?.dailyGold === "number"
    && typeof twin.resources?.dailyCore === "number"
    && (twin.identity === undefined || (typeof twin.identity.nickname === "string"
      && ["verified-import", "observed-ranking"].includes(twin.identity.source)
      && typeof twin.identity.importedAt === "string"
      && (twin.identity.pid === undefined || typeof twin.identity.pid === "string")));
}

export function digitalTwinFromProfileV48(profile: StoredProfileV3): UserDigitalTwinV48 {
  return isDigitalTwinV48(profile.digitalTwin)
    ? structuredClone(profile.digitalTwin)
    : createDigitalTwinV48({ planner: profile.state, activeDeckIds: profile.activeDeckIds, deckGoal: profile.deckGoal, spendProfile: profile.spendProfile });
}

export function updateTwinPlannerV48(twin: UserDigitalTwinV48, planner: PlannerStateV3, activeDeckIds: readonly string[]): UserDigitalTwinV48 {
  const primary = twin.decks.find((deck) => deck.id === twin.primaryDeckId);
  const decks = primary
    ? twin.decks.map((deck) => deck.id === primary.id ? { ...deck, diceIds: [...activeDeckIds] } : deck)
    : [...twin.decks, { id: "primary", name: "Primary", diceIds: [...activeDeckIds], role: "balanced" as const }];
  return { ...twin, planner: structuredClone(planner), decks };
}

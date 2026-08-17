import type { PlannerStateV3 } from "../planner-v3/types";

const STORAGE_KEY = "dicetree.profiles.v3";

export type StoredDeckGoalV3 = "dealer" | "support" | "balanced";
export type StoredSpendProfileV3 = "free" | "light" | "invested";

export interface StoredProfileV3 {
  id: string;
  name: string;
  state: PlannerStateV3;
  activeDeckIds: string[];
  deckGoal: StoredDeckGoalV3;
  spendProfile: StoredSpendProfileV3;
  createdAt: string;
  modifiedAt: string;
}

function valid(value: unknown): value is StoredProfileV3 {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<StoredProfileV3>;
  return typeof profile.id === "string" && typeof profile.name === "string"
    && profile.state?.schemaVersion === 3 && Array.isArray(profile.activeDeckIds)
    && profile.activeDeckIds.every((id) => typeof id === "string")
    && ["dealer", "support", "balanced"].includes(profile.deckGoal ?? "")
    && ["free", "light", "invested"].includes(profile.spendProfile ?? "")
    && typeof profile.createdAt === "string" && typeof profile.modifiedAt === "string";
}

export function listProfilesV3(): StoredProfileV3[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(valid).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)) : [];
  } catch {
    return [];
  }
}

function write(profiles: StoredProfileV3[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function saveProfileV3(
  input: Pick<StoredProfileV3, "name" | "state" | "activeDeckIds" | "deckGoal" | "spendProfile">,
  id?: string,
): StoredProfileV3 {
  const current = listProfilesV3();
  const existing = id ? current.find((profile) => profile.id === id) : undefined;
  const now = new Date().toISOString();
  const profile: StoredProfileV3 = {
    ...input,
    state: structuredClone(input.state),
    activeDeckIds: [...input.activeDeckIds],
    id: id ?? crypto.randomUUID(),
    name: input.name.trim() || "Untitled",
    createdAt: existing?.createdAt ?? now,
    modifiedAt: now,
  };
  write([profile, ...current.filter((candidate) => candidate.id !== profile.id)]);
  return profile;
}

export function deleteProfileV3(id: string) {
  write(listProfilesV3().filter((profile) => profile.id !== id));
}

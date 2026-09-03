import type { PlannerStateV3 } from "../planner-v3/types";
import type { UserDigitalTwinV48 } from "../account/digitalTwinV48";

const STORAGE_KEY = "dicetree.profiles.v3";
const PROFILE_BACKUP_KIND = "dicetree-profile-backup";
const PROFILE_BACKUP_VERSION = 1;

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
  digitalTwin?: UserDigitalTwinV48;
}

export interface ProfileBackupV55 {
  kind: typeof PROFILE_BACKUP_KIND;
  version: typeof PROFILE_BACKUP_VERSION;
  exportedAt: string;
  profiles: StoredProfileV3[];
}

export interface ProfileBackupImportResultV55 {
  imported: number;
  updated: number;
  skipped: number;
  profiles: StoredProfileV3[];
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

export function normalizeProfileNameV3(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function findProfileByNameV3(name: string): StoredProfileV3 | undefined {
  const query = normalizeProfileNameV3(name);
  if (!query) return undefined;
  const profile = listProfilesV3().find((candidate) => normalizeProfileNameV3(candidate.name) === query);
  return profile ? structuredClone(profile) : undefined;
}

function write(profiles: StoredProfileV3[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function cloneProfile(profile: StoredProfileV3): StoredProfileV3 {
  return structuredClone(profile);
}

export function saveProfileV3(
  input: Pick<StoredProfileV3, "name" | "state" | "activeDeckIds" | "deckGoal" | "spendProfile"> & Pick<Partial<StoredProfileV3>, "digitalTwin">,
  id?: string,
): StoredProfileV3 {
  const current = listProfilesV3();
  const existing = id ? current.find((profile) => profile.id === id) : undefined;
  const now = new Date().toISOString();
  const profile: StoredProfileV3 = {
    ...input,
    state: structuredClone(input.state),
    activeDeckIds: [...input.activeDeckIds],
    ...(input.digitalTwin ? { digitalTwin: structuredClone(input.digitalTwin) } : {}),
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

/** Creates a portable backup that can be restored in another browser or device. */
export function createProfileBackupV55(profiles = listProfilesV3()): ProfileBackupV55 {
  return {
    kind: PROFILE_BACKUP_KIND,
    version: PROFILE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profiles: profiles.filter(valid).map(cloneProfile),
  };
}

export function serializeProfileBackupV55(profiles = listProfilesV3()): string {
  return JSON.stringify(createProfileBackupV55(profiles), null, 2);
}

function isProfileBackupV55(value: unknown): value is ProfileBackupV55 {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<ProfileBackupV55>;
  return backup.kind === PROFILE_BACKUP_KIND
    && backup.version === PROFILE_BACKUP_VERSION
    && typeof backup.exportedAt === "string"
    && Array.isArray(backup.profiles)
    && backup.profiles.every(valid);
}

/**
 * Restores a backup without silently discarding newer local work. A matching
 * profile id or normalized name is updated only when the imported copy is newer.
 */
export function importProfileBackupV55(serialized: string): ProfileBackupImportResultV55 {
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); }
  catch { throw new Error("INVALID_PROFILE_BACKUP"); }
  if (!isProfileBackupV55(parsed)) throw new Error("INVALID_PROFILE_BACKUP");

  const merged = listProfilesV3().map(cloneProfile);
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const incoming of parsed.profiles.map(cloneProfile)) {
    const matchIndex = merged.findIndex((profile) => profile.id === incoming.id
      || normalizeProfileNameV3(profile.name) === normalizeProfileNameV3(incoming.name));
    if (matchIndex < 0) {
      merged.push(incoming);
      imported += 1;
      continue;
    }
    const existing = merged[matchIndex];
    if (incoming.modifiedAt > existing.modifiedAt) {
      merged[matchIndex] = { ...incoming, id: existing.id, createdAt: existing.createdAt };
      updated += 1;
    } else skipped += 1;
  }
  write(merged);
  return { imported, updated, skipped, profiles: listProfilesV3() };
}

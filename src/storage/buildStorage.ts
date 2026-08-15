import type { PlannerStateV1 } from "../domain/types";

const INDEX_KEY = "dicetree.build-index.v1";
const PREFIX = "dicetree.build.";

export interface StoredBuild {
  id: string;
  name: string;
  state: PlannerStateV1;
  createdAt: string;
  modifiedAt: string;
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export function listNamedBuilds(): StoredBuild[] {
  const ids = new Set(readIndex());
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX) && key !== INDEX_KEY) ids.add(key.slice(PREFIX.length));
  }
  const builds: StoredBuild[] = [];
  for (const id of ids) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${id}`);
      if (!raw) continue;
      const build = JSON.parse(raw) as StoredBuild;
      if (build && typeof build.name === "string" && build.state?.schemaVersion === 1) builds.push(build);
    } catch {
      // Corrupt entries are intentionally isolated.
    }
  }
  return builds.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export function saveNamedBuild(name: string, state: PlannerStateV1, id?: string): StoredBuild {
  const now = new Date().toISOString();
  const existing = id ? loadNamedBuild(id) : null;
  const build: StoredBuild = {
    id: id ?? crypto.randomUUID(),
    name: name.trim() || "Untitled",
    state,
    createdAt: existing?.createdAt ?? now,
    modifiedAt: now,
  };
  localStorage.setItem(`${PREFIX}${build.id}`, JSON.stringify(build));
  const ids = readIndex().filter((x) => x !== build.id);
  writeIndex([build.id, ...ids]);
  return build;
}

export function loadNamedBuild(id: string): StoredBuild | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as StoredBuild) : null;
  } catch {
    return null;
  }
}

export function deleteNamedBuild(id: string) {
  localStorage.removeItem(`${PREFIX}${id}`);
  writeIndex(readIndex().filter((x) => x !== id));
}

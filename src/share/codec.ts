import type { PlannerStateV1, PlannerRole, SpendingProfile } from "../domain/types";
import { migratePlannerState } from "./migrate";

export interface DecodeResult {
  state: PlannerStateV1 | null;
  warnings: string[];
  error?: string;
}

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(encoded: string) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function canonicalState(state: PlannerStateV1): PlannerStateV1 {
  const sortedRanks = Object.fromEntries(Object.entries(state.ranks).sort(([a], [b]) => a.localeCompare(b)));
  return { ...state, ranks: sortedRanks, goals: { ...state.goals, secondaryDieIds: [...state.goals.secondaryDieIds].sort() } };
}

export function encodePlannerState(state: PlannerStateV1): string {
  return `v1.${toBase64Url(JSON.stringify(canonicalState(state)))}`;
}

const roles = new Set<PlannerRole>(["dealer", "support", "balanced"]);
const profiles = new Set<SpendingProfile>(["f2p", "light", "spender"]);

export function decodePlannerState(encoded: string, validNodeIds: Set<string>): DecodeResult {
  try {
    if (!encoded.startsWith("v1.")) return { state: null, warnings: [], error: "unsupported-schema" };
    const raw = JSON.parse(fromBase64Url(encoded.slice(3)));
    const migrated = migratePlannerState(raw);
    if (!migrated) return { state: null, warnings: [], error: "invalid-state" };
    if (!roles.has(migrated.goals?.role) || !profiles.has(migrated.goals?.spendingProfile)) {
      return { state: null, warnings: [], error: "invalid-goals" };
    }
    const warnings: string[] = [];
    const ranks: Record<string, number> = {};
    for (const [nodeId, rank] of Object.entries(migrated.ranks ?? {})) {
      if (!validNodeIds.has(nodeId)) {
        warnings.push(`unknown-node:${nodeId}`);
        continue;
      }
      if (!Number.isInteger(rank) || rank < 0 || rank > 999) {
        warnings.push(`invalid-rank:${nodeId}`);
        continue;
      }
      ranks[nodeId] = rank;
    }
    return { state: { ...migrated, ranks }, warnings };
  } catch {
    return { state: null, warnings: [], error: "malformed-payload" };
  }
}

export function loadSharedStateFromHash(hash: string, validNodeIds: Set<string>): DecodeResult | null {
  const match = hash.match(/(?:^#|&)b=([^&]+)/);
  if (!match) return null;
  return decodePlannerState(decodeURIComponent(match[1]), validNodeIds);
}

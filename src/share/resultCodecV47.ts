import type { PlannerStateV3 } from "../planner-v3/types";
import { decodeV3, encodeV3, type DecodeV3Options } from "./codecV3";

export interface SharedResultV47 {
  state: PlannerStateV3;
  deckIds: string[];
  title: string;
  note: string;
  author: string;
}

export type DecodeSharedResultV47 = { ok: true; result: SharedResultV47; warnings: string[] } | { ok: false; error: string };

function encodeText(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeText(value: string) {
  let encoded = value.replaceAll("-", "+").replaceAll("_", "/");
  while (encoded.length % 4) encoded += "=";
  const binary = atob(encoded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function encodeSharedResultV47(result: SharedResultV47) {
  return `r47.${encodeText(JSON.stringify({
    state: encodeV3(result.state),
    deckIds: result.deckIds,
    title: result.title.slice(0, 80),
    note: result.note.slice(0, 500),
    author: result.author.slice(0, 40),
  }))}`;
}

export function decodeSharedResultV47(value: string, options: DecodeV3Options): DecodeSharedResultV47 {
  try {
    if (!value.startsWith("r47.")) return { ok: false, error: "unsupported-result-version" };
    const raw = JSON.parse(decodeText(value.slice(4))) as Record<string, unknown>;
    if (typeof raw.state !== "string" || !Array.isArray(raw.deckIds) || typeof raw.title !== "string" || typeof raw.note !== "string" || typeof raw.author !== "string") {
      return { ok: false, error: "invalid-result" };
    }
    const decoded = decodeV3(raw.state, options);
    if (!decoded.ok) return { ok: false, error: decoded.error };
    const warnings = [...decoded.warnings];
    const deckIds = [...new Set(raw.deckIds.filter((id): id is string => typeof id === "string" && options.validDiceIds.has(id)))].slice(0, 5);
    if (deckIds.length !== raw.deckIds.length) warnings.push("invalid-deck-entries-removed");
    return { ok: true, result: { state: decoded.state, deckIds, title: raw.title.slice(0, 80), note: raw.note.slice(0, 500), author: raw.author.slice(0, 40) }, warnings };
  } catch {
    return { ok: false, error: "malformed-result" };
  }
}

export function decodeSharedResultFromHashV47(hash: string, options: DecodeV3Options) {
  if (!hash.startsWith("#r=")) return null;
  return decodeSharedResultV47(decodeURIComponent(hash.slice(3)), options);
}

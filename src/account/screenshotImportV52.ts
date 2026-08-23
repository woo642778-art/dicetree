import type { CanonicalGameData } from "../game-data/types";

export interface ScreenshotAccountDraftV52 {
  rawText: string;
  gold?: number;
  stone?: number;
  diceLevels: Record<string, number>;
  nodeRanks: Record<string, number>;
  confidence: number;
  review: string[];
}

function numbers(text: string) {
  return [...text.matchAll(/\b\d[\d,.]*\b/g)].map((match) => Number(match[0].replaceAll(",", ""))).filter(Number.isFinite);
}

function nearNumber(text: string, terms: string[]) {
  for (const term of terms) {
    const forward = text.match(new RegExp(`${term}[^\\d]{0,18}(\\d[\\d,.]*)`, "iu"));
    if (forward) return Number(forward[1].replaceAll(",", ""));
    const backward = text.match(new RegExp(`(\\d[\\d,.]*)[^\\p{L}\\d]{0,18}${term}`, "iu"));
    if (backward) return Number(backward[1].replaceAll(",", ""));
  }
  return undefined;
}

export function parseAccountScreenshotTextV52(text: string, data: CanonicalGameData): ScreenshotAccountDraftV52 {
  const normalized = text.normalize("NFKC");
  const allNumbers = numbers(normalized);
  let gold = nearNumber(normalized, ["골드", "gold", "coin", "코인"]);
  let stone = nearNumber(normalized, ["다이스 코어", "dice core", "core", "코어"]);
  const review: string[] = [];
  if (gold === undefined && allNumbers.length >= 4) {
    gold = allNumbers.at(-1);
    review.push("gold-position-inference");
  }
  if (stone === undefined && allNumbers.length >= 4) {
    stone = allNumbers.at(-2);
    review.push("core-position-inference");
  }
  const diceLevels: Record<string, number> = {};
  for (const dice of data.dice) {
    if (!dice.nameKey) continue;
    const aliases = [dice.id, data.localization.ko[dice.nameKey], data.localization.en[dice.nameKey]].filter(Boolean);
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = normalized.match(new RegExp(`${escaped}[^\\d]{0,12}(?:lv\\.?|레벨)?\\s*(\\d{1,3})`, "iu"));
      if (match) { diceLevels[dice.id] = Math.max(1, Math.min(100, Number(match[1]))); break; }
    }
  }
  const nodeRanks: Record<string, number> = {};
  for (const node of data.tree) {
    if (!node.nameKey) continue;
    const name = data.localization.ko[node.nameKey] ?? data.localization.en[node.nameKey];
    if (!name) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = normalized.match(new RegExp(`${escaped}[^\\d]{0,12}(?:lv\\.?|랭크)?\\s*(\\d{1,3})`, "iu"));
    if (match) nodeRanks[node.id] = Math.max(0, Math.min(node.maxRank, Number(match[1])));
  }
  const directResources = !review.length;
  const evidenceCount = Number(gold !== undefined) + Number(stone !== undefined) + Object.keys(diceLevels).length + Object.keys(nodeRanks).length;
  const confidence = Math.min(0.98, (directResources ? 0.5 : 0.3) + Math.min(0.45, evidenceCount * 0.06));
  if (confidence < 0.75) review.push("low-confidence-confirmation-required");
  return { rawText: normalized, ...(gold === undefined ? {} : { gold }), ...(stone === undefined ? {} : { stone }), diceLevels, nodeRanks, confidence, review };
}

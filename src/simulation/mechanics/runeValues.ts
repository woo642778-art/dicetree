import type { RuneDefinitionV3 } from "../../game-data/types";

export function runeNumberAtRank(
  rune: RuneDefinitionV3,
  rank: number,
  valueKey: string,
): number | null {
  if (!Number.isInteger(rank) || rank < 0 || (rune.maxRank !== undefined && rank > rune.maxRank)) {
    throw new RangeError(`Invalid rune rank for ${rune.id}: ${rank}`);
  }
  if (rank === 0) return null;
  const base = rune.values[valueKey];
  if (typeof base !== "number") return null;
  const add = rune.values[`${valueKey}_RankAdd`];
  return base + (rank - 1) * (typeof add === "number" ? add : 0);
}

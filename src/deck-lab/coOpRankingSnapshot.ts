export type CoOpDeckRole = "dealer" | "support";

export interface CoOpRankedDeck {
  rank: number;
  diceIds: readonly string[];
  role: CoOpDeckRole;
  score?: number;
}

export interface DiceUsageCount {
  diceId: string;
  decks: number;
  share: number;
}

export const CO_OP_RANKING_SNAPSHOT_DATE = "2026-08-16";
export const CO_OP_RANKING_SOURCE_COUNT = 15;

const DEALER_CORES = new Set(["predator", "electric", "sawblade"]);

export function classifyCoOpDeck(diceIds: readonly string[]): CoOpDeckRole {
  return diceIds.some((diceId) => DEALER_CORES.has(diceId)) ? "dealer" : "support";
}

const SNAPSHOT_DICE: readonly (readonly string[])[] = [
  ["predator", "brokengrowth", "decay", "switch", "adjust"],
  ["adjust", "brokengrowth", "lock", "slow", "ice"],
  ["predator", "decay", "brokengrowth", "adjust", "light"],
  ["predator", "decay", "switch", "adjust", "brokengrowth"],
  ["ice", "lock", "slow", "summon", "adjust"],
  ["brokengrowth", "adjust", "predator", "decay", "summon"],
  ["slow", "ice", "adjust", "summon", "lock"],
  ["predator", "brokengrowth", "summon", "adjust", "slow"],
  ["slow", "lock", "brokengrowth", "adjust", "summon"],
  ["light", "predator", "brokengrowth", "adjust", "switch"],
  ["ice", "slow", "lock", "summon", "adjust"],
  ["decay", "adjust", "light", "brokengrowth", "predator"],
  ["decay", "brokengrowth", "predator", "switch", "adjust"],
  ["summon", "ice", "lock", "slow", "adjust"],
  ["adjust", "summon", "brokengrowth", "predator", "decay"],
  ["lock", "summon", "resonance", "adjust", "ice"],
  ["predator", "adjust", "brokengrowth", "summon", "decay"],
  ["adjust", "summon", "brokengrowth", "predator", "decay"],
  ["adjust", "summon", "resonance", "brokengrowth", "lock"],
  ["predator", "brokengrowth", "switch", "adjust", "decay"],
  ["adjust", "summon", "lock", "blessing", "slow"],
  ["predator", "decay", "brokengrowth", "adjust", "summon"],
  ["resonance", "adjust", "lock", "ice", "slow"],
  ["predator", "brokengrowth", "decay", "switch", "adjust"],
  ["lock", "ice", "slow", "resonance", "adjust"],
  ["adjust", "light", "predator", "decay", "brokengrowth"],
  ["resonance", "ice", "lock", "brokengrowth", "adjust"],
  ["brokengrowth", "predator", "decay", "adjust", "switch"],
  ["lock", "summon", "adjust", "slow", "ice"],
  ["predator", "decay", "adjust", "brokengrowth", "switch"],
  ["lock", "ice", "adjust", "slow", "summon"],
  ["bubble", "adjust", "decay", "brokengrowth", "predator"],
  ["summon", "ice", "resonance", "adjust", "lock"],
  ["switch", "adjust", "brokengrowth", "light", "predator"],
  ["summon", "adjust", "ice", "lock", "resonance"],
  ["predator", "brokengrowth", "decay", "switch", "adjust"],
  ["adjust", "summon", "resonance", "ice", "lock"],
  ["brokengrowth", "predator", "decay", "switch", "adjust"],
  ["resonance", "lock", "adjust", "summon", "brokengrowth"],
  ["switch", "adjust", "brokengrowth", "predator", "decay"],
  ["adjust", "summon", "slow", "ice", "lock"],
  ["decay", "predator", "adjust", "brokengrowth", "switch"],
  ["adjust", "ice", "resonance", "lock", "brokengrowth"],
  ["predator", "decay", "brokengrowth", "adjust", "bubble"],
  ["resonance", "adjust", "summon", "lock", "ice"],
  ["box", "blessing", "summon", "adjust", "brokengrowth"],
  ["lock", "brokengrowth", "adjust", "resonance", "ice"],
  ["switch", "adjust", "brokengrowth", "decay", "predator"],
  ["summon", "ice", "lock", "slow", "adjust"],
  ["predator", "brokengrowth", "decay", "summon", "adjust"],
  ["ice", "lock", "resonance", "adjust", "summon"],
  ["predator", "decay", "switch", "adjust", "brokengrowth"],
  ["resonance", "summon", "adjust", "slow", "lock"],
  ["predator", "decay", "adjust", "switch", "brokengrowth"],
  ["ice", "lock", "adjust", "summon", "resonance"],
  ["box", "adjust", "summon", "brokengrowth", "blessing"],
  ["predator", "decay", "brokengrowth", "summon", "adjust"],
  ["lock", "ice", "adjust", "summon", "resonance"],
  ["adjust", "summon", "brokengrowth", "predator", "decay"],
  ["slow", "ice", "lock", "adjust", "summon"],
  ["predator", "brokengrowth", "decay", "adjust", "summon"],
  ["ice", "element", "adjust", "lock", "summon"],
  ["electric", "decay", "light", "adjust", "brokengrowth"],
  ["lock", "ice", "resonance", "slow", "adjust"],
  ["light", "decay", "adjust", "predator", "brokengrowth"],
  ["adjust", "ice", "lock", "resonance", "slow"],
  ["predator", "light", "adjust", "decay", "brokengrowth"],
  ["lock", "adjust", "summon", "brokengrowth", "resonance"],
  ["predator", "brokengrowth", "decay", "switch", "adjust"],
  ["ice", "lock", "summon", "adjust", "resonance"],
  ["predator", "decay", "brokengrowth", "adjust", "summon"],
  ["switch", "adjust", "decay", "predator", "summon"],
  ["summon", "adjust", "ice", "resonance", "lock"],
  ["resonance", "ice", "lock", "summon", "adjust"],
  ["predator", "brokengrowth", "decay", "adjust", "switch"],
  ["adjust", "ice", "summon", "resonance", "lock"],
  ["predator", "decay", "summon", "brokengrowth", "adjust"],
  ["resonance", "brokengrowth", "lock", "slow", "adjust"],
  ["adjust", "brokengrowth", "decay", "blessing", "predator"],
  ["brokengrowth", "ice", "slow", "lock", "adjust"],
  ["predator", "decay", "brokengrowth", "adjust", "summon"],
  ["lock", "ice", "adjust", "summon", "resonance"],
  ["predator", "brokengrowth", "adjust", "decay", "light"],
  ["lock", "adjust", "summon", "ice", "sawblade"],
  ["decay", "predator", "brokengrowth", "summon", "adjust"],
  ["ice", "adjust", "lock", "brokengrowth", "slow"],
  ["brokengrowth", "predator", "adjust", "switch", "decay"],
  ["resonance", "lock", "ice", "summon", "adjust"],
  ["adjust", "summon", "resonance", "lock", "ice"],
  ["brokengrowth", "decay", "predator", "adjust", "summon"],
  ["adjust", "light", "brokengrowth", "decay", "predator"],
  ["resonance", "lock", "adjust", "blessing", "brokengrowth"],
  ["summon", "adjust", "brokengrowth", "predator", "decay"],
  ["adjust", "summon", "lock", "resonance", "ice"],
  ["predator", "adjust", "brokengrowth", "light", "switch"],
  ["ice", "summon", "lock", "adjust", "slow"],
  ["predator", "light", "brokengrowth", "decay", "adjust"],
  ["adjust", "ice", "resonance", "slow", "lock"],
  ["ice", "adjust", "summon", "lock", "slow"],
  ["predator", "summon", "switch", "light", "adjust"],
  ["predator", "adjust", "decay", "brokengrowth", "switch"],
  ["adjust", "slow", "brokengrowth", "lock", "resonance"],
  ["predator", "adjust", "decay", "summon", "brokengrowth"],
  ["lock", "ice", "adjust", "slow", "resonance"],
  ["adjust", "decay", "predator", "light", "brokengrowth"],
] as const;

const TOP_SCORES = [1_718_500, 1_718_400, 1_646_600, 1_428_600, 1_428_500, 1_360_000, 1_359_900] as const;

export const CO_OP_RANKING_SNAPSHOT: readonly CoOpRankedDeck[] = SNAPSHOT_DICE.map((diceIds, index) => ({
  rank: index + 1,
  diceIds,
  role: classifyCoOpDeck(diceIds),
  ...(TOP_SCORES[index] ? { score: TOP_SCORES[index] } : {}),
}));

export function summarizeDiceUsage(decks: readonly CoOpRankedDeck[] = CO_OP_RANKING_SNAPSHOT): DiceUsageCount[] {
  const counts = new Map<string, number>();
  for (const deck of decks) {
    for (const diceId of new Set(deck.diceIds)) counts.set(diceId, (counts.get(diceId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([diceId, deckCount]) => ({ diceId, decks: deckCount, share: deckCount / decks.length }))
    .sort((left, right) => right.decks - left.decks || left.diceId.localeCompare(right.diceId));
}

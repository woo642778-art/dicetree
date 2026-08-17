import type { CoOpRankedDeck } from "./coOpRankingSnapshot";

export interface MetaClusterV48 {
  id: string;
  label: "predator-carry" | "control-support" | "alternative-carry" | "hybrid";
  decks: number;
  share: number;
  averageRank: number;
  coreDiceIds: string[];
  role: "dealer" | "support" | "mixed";
  diversity: number;
}

function clusterLabel(deck: CoOpRankedDeck): MetaClusterV48["label"] {
  if (deck.diceIds.includes("predator")) return "predator-carry";
  if (deck.diceIds.some((id) => ["electric", "sawblade", "element"].includes(id))) return "alternative-carry";
  if (deck.role === "support") return "control-support";
  return "hybrid";
}

export function clusterMetaDecksV48(decks: readonly CoOpRankedDeck[]): MetaClusterV48[] {
  const grouped = new Map<MetaClusterV48["label"], CoOpRankedDeck[]>();
  for (const deck of decks) grouped.set(clusterLabel(deck), [...(grouped.get(clusterLabel(deck)) ?? []), deck]);
  return [...grouped.entries()].map(([label, entries]) => {
    const counts = new Map<string, number>();
    const signatures = new Set<string>();
    for (const deck of entries) {
      for (const id of new Set(deck.diceIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
      signatures.add([...deck.diceIds].sort().join("|"));
    }
    const roles = new Set(entries.map((entry) => entry.role));
    return {
      id: `cluster:${label}`, label, decks: entries.length, share: decks.length ? entries.length / decks.length : 0,
      averageRank: entries.reduce((sum, entry) => sum + entry.rank, 0) / Math.max(1, entries.length),
      coreDiceIds: [...counts.entries()].filter(([, count]) => count / entries.length >= 0.55).sort((a, b) => b[1] - a[1]).map(([id]) => id),
      role: (roles.size === 1 ? entries[0].role : "mixed") as MetaClusterV48["role"],
      diversity: signatures.size / Math.max(1, entries.length),
    };
  }).sort((a, b) => b.decks - a.decks || a.averageRank - b.averageRank);
}

export function metaEnvironmentScoresV48(decks: readonly CoOpRankedDeck[]) {
  const total = Math.max(1, decks.length);
  const shareWith = (ids: readonly string[]) => decks.filter((deck) => deck.diceIds.some((id) => ids.includes(id))).length / total;
  const supportShare = decks.filter((deck) => deck.role === "support").length / total;
  return {
    burst: Math.round(shareWith(["predator", "electric", "sawblade"]) * 100),
    control: Math.round(shareWith(["ice", "slow", "lock", "resonance"]) * 100),
    economy: Math.round(shareWith(["summon", "brokengrowth", "joker"]) * 100),
    support: Math.round(supportShare * 100),
  };
}
